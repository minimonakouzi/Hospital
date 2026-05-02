import mongoose from "mongoose";
import { getAuth } from "@clerk/express";
import Admission from "../models/Admission.js";
import Appointment from "../models/Appointment.js";
import PatientBill from "../models/PatientBill.js";
import PatientProfile from "../models/PatientProfile.js";
import ServiceAppointment from "../models/serviceAppointment.js";
import { createPatientNotification } from "../utils/createPatientNotification.js";

const BILL_TYPES = [
  "Appointment",
  "Service",
  "Admission",
  "Lab",
  "Radiology",
  "Prescription",
  "Other",
];
const PAYMENT_STATUSES = ["Unpaid", "Paid", "Partially Paid", "Refunded"];
const INSURANCE_STATUSES = [
  "Not Provided",
  "Submitted",
  "Approved",
  "Rejected",
  "Pending",
];

function cleanString(value) {
  return String(value ?? "").trim();
}

function escapeRegex(value = "") {
  return cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message = "Bill not found.") {
  return res.status(404).json({ success: false, message });
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(number, 0);
}

function money(value) {
  return Math.round(safeNumber(value) * 100) / 100;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveClerkUserId(req) {
  const fromReq =
    req.auth?.userId ||
    req.auth?.user_id ||
    req.auth?.user?.id ||
    req.user?.id ||
    null;
  if (fromReq) return fromReq;
  try {
    return getAuth(req)?.userId || null;
  } catch {
    return null;
  }
}

function populateBill(query) {
  return query
    .populate("patientId", "patientCode name email phone age gender clerkUserId")
    .populate("appointmentId", "patientName mobile date time status fees doctorName speciality")
    .populate("serviceAppointmentId", "patientName mobile serviceName date status fees")
    .populate("admissionId", "admissionDate status reasonForAdmission dischargeDate");
}

function calculateBillTotals(input = {}) {
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems
    .map((item = {}) => {
      const title = cleanString(item.title);
      const quantity = money(item.quantity || 1);
      const unitPrice = money(item.unitPrice);
      const total = money(quantity * unitPrice);
      return { title, quantity, unitPrice, total };
    })
    .filter((item) => item.title);

  const subtotal = money(
    items.length
      ? items.reduce((sum, item) => sum + item.total, 0)
      : input.subtotal ?? input.totalAmount,
  );
  const discount = money(input.discount);
  const tax = money(input.tax);
  const totalAmount = money(
    items.length || input.totalAmount === undefined
      ? Math.max(subtotal - discount + tax, 0)
      : input.totalAmount,
  );
  const insuranceCoverageAmount = money(input.insuranceCoverageAmount);
  const patientPayableAmount = money(
    Math.max(totalAmount - insuranceCoverageAmount, 0),
  );
  let paidAmount = money(input.paidAmount);
  let paymentStatus = cleanString(input.paymentStatus) || "Unpaid";

  if (!PAYMENT_STATUSES.includes(paymentStatus)) paymentStatus = "Unpaid";
  if (paymentStatus === "Paid" && paidAmount < patientPayableAmount) {
    paidAmount = patientPayableAmount;
  }
  if (paymentStatus === "Unpaid") paidAmount = 0;

  const dueAmount =
    paymentStatus === "Paid" ? 0 : money(Math.max(patientPayableAmount - paidAmount, 0));

  return {
    items,
    subtotal,
    discount,
    tax,
    totalAmount,
    insuranceCoverageAmount,
    patientPayableAmount,
    paidAmount,
    paymentStatus,
    dueAmount,
  };
}

async function getCurrentPatient(req, res) {
  const clerkUserId = resolveClerkUserId(req);
  if (!clerkUserId) {
    res
      .status(401)
      .json({ success: false, message: "Patient authentication required." });
    return null;
  }

  const patient = await PatientProfile.findOne({ clerkUserId }).lean();
  if (!patient) {
    res.status(404).json({ success: false, message: "Patient profile not found." });
    return null;
  }

  return patient;
}

async function validateOptionalRef(Model, id, label) {
  const value = cleanString(id);
  if (!value) return { value: null };
  if (!isValidObjectId(value)) return { error: `Invalid ${label}.` };
  const exists = await Model.exists({ _id: value });
  if (!exists) return { error: `${label} not found.` };
  return { value };
}

function buildFilter(query = {}, base = {}) {
  const filter = { ...base };
  const billType = cleanString(query.billType || query.type);
  const paymentStatus = cleanString(query.paymentStatus || query.status);
  const insuranceStatus = cleanString(query.insuranceStatus);
  const patientId = cleanString(query.patientId);
  const search = cleanString(query.search);

  if (BILL_TYPES.includes(billType)) filter.billType = billType;
  if (PAYMENT_STATUSES.includes(paymentStatus)) filter.paymentStatus = paymentStatus;
  if (INSURANCE_STATUSES.includes(insuranceStatus)) {
    filter.insuranceStatus = insuranceStatus;
  }
  if (patientId && isValidObjectId(patientId)) filter.patientId = patientId;
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { billCode: re },
      { billType: re },
      { description: re },
      { notes: re },
      { insuranceProvider: re },
      { insurancePolicyNumber: re },
      { "items.title": re },
    ];
  }

  return filter;
}

async function normalizeCreatePayload(req, actor) {
  const body = req.body || {};
  const patientId = cleanString(body.patientId);
  const billType = cleanString(body.billType);

  if (!patientId) return { error: "patientId is required." };
  if (!isValidObjectId(patientId)) return { error: "Invalid patientId." };
  if (!BILL_TYPES.includes(billType)) return { error: "Invalid billType." };

  const patient = await PatientProfile.findById(patientId).lean();
  if (!patient) return { error: "Patient profile not found." };

  const hasItems =
    Array.isArray(body.items) &&
    body.items.some((item) => cleanString(item?.title));
  if (!hasItems && body.totalAmount === undefined) {
    return { error: "At least one bill item or totalAmount is required." };
  }

  const appointmentRef = await validateOptionalRef(
    Appointment,
    body.appointmentId,
    "appointmentId",
  );
  if (appointmentRef.error) return { error: appointmentRef.error };
  const serviceAppointmentRef = await validateOptionalRef(
    ServiceAppointment,
    body.serviceAppointmentId,
    "serviceAppointmentId",
  );
  if (serviceAppointmentRef.error) return { error: serviceAppointmentRef.error };
  const admissionRef = await validateOptionalRef(Admission, body.admissionId, "admissionId");
  if (admissionRef.error) return { error: admissionRef.error };

  const insuranceStatus = cleanString(body.insuranceStatus) || "Not Provided";
  if (!INSURANCE_STATUSES.includes(insuranceStatus)) {
    return { error: "Invalid insuranceStatus." };
  }

  const calculation = calculateBillTotals(body);
  const invoiceDate = parseDate(body.invoiceDate) || new Date();
  const dueDate = body.dueDate ? parseDate(body.dueDate) : null;
  if (body.dueDate && !dueDate) return { error: "Invalid dueDate." };

  return {
    patient,
    data: {
      patientId,
      appointmentId: appointmentRef.value,
      serviceAppointmentId: serviceAppointmentRef.value,
      admissionId: admissionRef.value,
      billType,
      description: cleanString(body.description),
      items: calculation.items,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      tax: calculation.tax,
      totalAmount: calculation.totalAmount,
      paymentStatus: calculation.paymentStatus,
      paymentMethod: cleanString(body.paymentMethod),
      paidAmount: calculation.paidAmount,
      dueAmount: calculation.dueAmount,
      insuranceProvider: cleanString(body.insuranceProvider),
      insurancePolicyNumber: cleanString(body.insurancePolicyNumber),
      insuranceStatus,
      insuranceCoverageAmount: calculation.insuranceCoverageAmount,
      patientPayableAmount: calculation.patientPayableAmount,
      invoiceDate,
      dueDate,
      notes: cleanString(body.notes),
      createdByRole: actor.role,
      createdById: cleanString(actor.id),
    },
  };
}

function notifyBillCreated(bill, actor) {
  void createPatientNotification({
    patientId: bill.patientId,
    title: "New invoice created",
    message: "A new bill is available in your account.",
    type: "Billing",
    link: "/my-billing",
    createdByRole: actor.role,
    createdById: actor.id,
    dedupeKey: `bill:${bill._id}:created`,
    metadata: {
      billId: String(bill._id),
      billCode: bill.billCode,
    },
  });
}

function notifyPaymentStatusUpdated(bill, actor) {
  void createPatientNotification({
    patientId: bill.patientId,
    title: "Billing status updated",
    message: "Your bill payment status has been updated.",
    type: "Billing",
    link: "/my-billing",
    createdByRole: actor.role,
    createdById: actor.id,
    dedupeKey: `bill:${bill._id}:payment:${bill.paymentStatus}`,
    metadata: {
      billId: String(bill._id),
      billCode: bill.billCode,
      paymentStatus: bill.paymentStatus,
    },
  });
}

async function createBill(req, res, actor) {
  const normalized = await normalizeCreatePayload(req, actor);
  if (normalized.error) return badRequest(res, normalized.error);

  const bill = await PatientBill.create(normalized.data);
  notifyBillCreated(bill, actor);
  const populated = await populateBill(PatientBill.findById(bill._id)).lean();

  return res
    .status(201)
    .json({ success: true, message: "Bill created successfully.", data: populated });
}

export async function createStaffBill(req, res) {
  try {
    const staffId = req.staff?._id || req.staff?.id;
    if (!staffId) {
      return res
        .status(401)
        .json({ success: false, message: "Staff authentication required." });
    }
    return await createBill(req, res, { role: "Staff", id: String(staffId) });
  } catch (err) {
    console.error("createStaffBill error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while creating bill." });
  }
}

export async function createAdminBill(req, res) {
  try {
    return await createBill(req, res, {
      role: "Admin",
      id: cleanString(req.admin?.userId),
    });
  } catch (err) {
    console.error("createAdminBill error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while creating bill." });
  }
}

export async function getMyBills(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;
    const bills = await populateBill(
      PatientBill.find(buildFilter(req.query, { patientId: patient._id })).sort({
        invoiceDate: -1,
        createdAt: -1,
      }),
    ).lean();
    return res.json({
      success: true,
      message: "Bills loaded successfully.",
      data: bills,
    });
  } catch (err) {
    console.error("getMyBills error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while loading bills." });
  }
}

export async function getMyBillById(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid bill id.");

    const bill = await populateBill(
      PatientBill.findOne({ _id: id, patientId: patient._id }),
    ).lean();
    if (!bill) return notFound(res);
    return res.json({
      success: true,
      message: "Bill loaded successfully.",
      data: bill,
    });
  } catch (err) {
    console.error("getMyBillById error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while loading bill." });
  }
}

export async function getStaffBills(req, res) {
  try {
    const bills = await populateBill(
      PatientBill.find(buildFilter(req.query)).sort({
        invoiceDate: -1,
        createdAt: -1,
      }),
    ).lean();
    return res.json({
      success: true,
      message: "Bills loaded successfully.",
      data: bills,
    });
  } catch (err) {
    console.error("getStaffBills error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while loading bills." });
  }
}

export async function getStaffBillById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid bill id.");
    const bill = await populateBill(PatientBill.findById(id)).lean();
    if (!bill) return notFound(res);
    return res.json({ success: true, message: "Bill loaded successfully.", data: bill });
  } catch (err) {
    console.error("getStaffBillById error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while loading bill." });
  }
}

export async function getAdminBills(req, res) {
  return getStaffBills(req, res);
}

export async function getAdminBillById(req, res) {
  return getStaffBillById(req, res);
}

async function updatePayment(req, res, actor) {
  const { id } = req.params;
  if (!isValidObjectId(id)) return badRequest(res, "Invalid bill id.");

  const status = cleanString(req.body?.paymentStatus || req.body?.status);
  if (!PAYMENT_STATUSES.includes(status)) return badRequest(res, "Invalid paymentStatus.");

  const bill = await PatientBill.findById(id);
  if (!bill) return notFound(res);

  const calculation = calculateBillTotals({
    ...bill.toObject(),
    paymentStatus: status,
    paidAmount:
      req.body?.paidAmount !== undefined ? req.body.paidAmount : bill.paidAmount,
  });

  bill.paymentStatus = calculation.paymentStatus;
  bill.paidAmount = calculation.paidAmount;
  bill.dueAmount = calculation.dueAmount;
  if (req.body?.paymentMethod !== undefined) {
    bill.paymentMethod = cleanString(req.body.paymentMethod);
  }
  await bill.save();
  notifyPaymentStatusUpdated(bill, actor);

  const populated = await populateBill(PatientBill.findById(bill._id)).lean();
  return res.json({
    success: true,
    message: "Payment information updated successfully.",
    data: populated,
  });
}

export async function updateStaffBillPayment(req, res) {
  try {
    return await updatePayment(req, res, {
      role: "Staff",
      id: cleanString(req.staff?._id || req.staff?.id),
    });
  } catch (err) {
    console.error("updateStaffBillPayment error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating payment information.",
    });
  }
}

export async function updateAdminBillPayment(req, res) {
  try {
    return await updatePayment(req, res, {
      role: "Admin",
      id: cleanString(req.admin?.userId),
    });
  } catch (err) {
    console.error("updateAdminBillPayment error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating payment information.",
    });
  }
}

async function updateInsurance(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) return badRequest(res, "Invalid bill id.");
  const bill = await PatientBill.findById(id);
  if (!bill) return notFound(res);

  if (req.body?.insuranceStatus !== undefined) {
    const status = cleanString(req.body.insuranceStatus);
    if (!INSURANCE_STATUSES.includes(status)) {
      return badRequest(res, "Invalid insuranceStatus.");
    }
    bill.insuranceStatus = status;
  }
  ["insuranceProvider", "insurancePolicyNumber"].forEach((field) => {
    if (req.body?.[field] !== undefined) bill[field] = cleanString(req.body[field]);
  });
  if (req.body?.insuranceCoverageAmount !== undefined) {
    bill.insuranceCoverageAmount = money(req.body.insuranceCoverageAmount);
  }

  const calculation = calculateBillTotals(bill.toObject());
  bill.patientPayableAmount = calculation.patientPayableAmount;
  bill.paidAmount = calculation.paidAmount;
  bill.dueAmount = calculation.dueAmount;
  await bill.save();

  const populated = await populateBill(PatientBill.findById(bill._id)).lean();
  return res.json({
    success: true,
    message: "Insurance information updated successfully.",
    data: populated,
  });
}

export async function updateStaffBillInsurance(req, res) {
  try {
    return await updateInsurance(req, res);
  } catch (err) {
    console.error("updateStaffBillInsurance error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating insurance information.",
    });
  }
}

export async function updateAdminBillInsurance(req, res) {
  try {
    return await updateInsurance(req, res);
  } catch (err) {
    console.error("updateAdminBillInsurance error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating insurance information.",
    });
  }
}

async function updateBill(req, res, actorRole) {
  const { id } = req.params;
  if (!isValidObjectId(id)) return badRequest(res, "Invalid bill id.");

  const bill = await PatientBill.findById(id);
  if (!bill) return notFound(res);
  if (actorRole === "Staff" && bill.paymentStatus === "Paid") {
    return badRequest(res, "Paid bills cannot be edited by staff.");
  }

  ["description", "paymentMethod", "notes"].forEach((field) => {
    if (req.body?.[field] !== undefined) bill[field] = cleanString(req.body[field]);
  });
  if (req.body?.billType !== undefined) {
    const billType = cleanString(req.body.billType);
    if (!BILL_TYPES.includes(billType)) return badRequest(res, "Invalid billType.");
    bill.billType = billType;
  }
  if (req.body?.items !== undefined) bill.items = req.body.items;
  ["discount", "tax", "totalAmount", "paidAmount", "insuranceCoverageAmount"].forEach(
    (field) => {
      if (req.body?.[field] !== undefined) bill[field] = money(req.body[field]);
    },
  );
  if (req.body?.paymentStatus !== undefined) {
    const paymentStatus = cleanString(req.body.paymentStatus);
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return badRequest(res, "Invalid paymentStatus.");
    }
    bill.paymentStatus = paymentStatus;
  }
  if (req.body?.insuranceStatus !== undefined) {
    const insuranceStatus = cleanString(req.body.insuranceStatus);
    if (!INSURANCE_STATUSES.includes(insuranceStatus)) {
      return badRequest(res, "Invalid insuranceStatus.");
    }
    bill.insuranceStatus = insuranceStatus;
  }
  ["insuranceProvider", "insurancePolicyNumber"].forEach((field) => {
    if (req.body?.[field] !== undefined) bill[field] = cleanString(req.body[field]);
  });
  if (req.body?.invoiceDate !== undefined) {
    const invoiceDate = parseDate(req.body.invoiceDate);
    if (!invoiceDate) return badRequest(res, "Invalid invoiceDate.");
    bill.invoiceDate = invoiceDate;
  }
  if (req.body?.dueDate !== undefined) {
    const dueDate = parseDate(req.body.dueDate);
    if (!dueDate) return badRequest(res, "Invalid dueDate.");
    bill.dueDate = dueDate;
  }

  const calculation = calculateBillTotals(bill.toObject());
  bill.items = calculation.items;
  bill.subtotal = calculation.subtotal;
  bill.discount = calculation.discount;
  bill.tax = calculation.tax;
  bill.totalAmount = calculation.totalAmount;
  bill.insuranceCoverageAmount = calculation.insuranceCoverageAmount;
  bill.patientPayableAmount = calculation.patientPayableAmount;
  bill.paidAmount = calculation.paidAmount;
  bill.paymentStatus = calculation.paymentStatus;
  bill.dueAmount = calculation.dueAmount;
  await bill.save();

  const populated = await populateBill(PatientBill.findById(bill._id)).lean();
  return res.json({
    success: true,
    message: "Bill updated successfully.",
    data: populated,
  });
}

export async function updateStaffBill(req, res) {
  try {
    return await updateBill(req, res, "Staff");
  } catch (err) {
    console.error("updateStaffBill error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while updating bill." });
  }
}

export async function updateAdminBill(req, res) {
  try {
    return await updateBill(req, res, "Admin");
  } catch (err) {
    console.error("updateAdminBill error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while updating bill." });
  }
}

async function deleteBill(req, res, actorRole) {
  const { id } = req.params;
  if (!isValidObjectId(id)) return badRequest(res, "Invalid bill id.");
  const bill = await PatientBill.findById(id);
  if (!bill) return notFound(res);

  if (actorRole === "Staff" && bill.paymentStatus === "Paid") {
    return badRequest(res, "Staff cannot delete paid bills.");
  }

  await bill.deleteOne();
  return res.json({
    success: true,
    message: "Bill deleted successfully.",
    data: { _id: id },
  });
}

export async function deleteStaffBill(req, res) {
  try {
    return await deleteBill(req, res, "Staff");
  } catch (err) {
    console.error("deleteStaffBill error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while deleting bill." });
  }
}

export async function deleteAdminBill(req, res) {
  try {
    return await deleteBill(req, res, "Admin");
  } catch (err) {
    console.error("deleteAdminBill error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while deleting bill." });
  }
}
