import mongoose from "mongoose";
import { getAuth } from "@clerk/express";
import Admission from "../models/Admission.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import LabReport from "../models/LabReport.js";
import PatientProfile from "../models/PatientProfile.js";
import ServiceAppointment from "../models/serviceAppointment.js";
import { createPatientNotification } from "../utils/createPatientNotification.js";

const TEST_TYPES = ["Blood Test", "Urine Test", "Diabetes Test", "Cholesterol Test", "Infection Test", "Other"];
const STATUSES = ["Requested", "In Progress", "Completed", "Reviewed"];
const FLAGS = ["Normal", "High", "Low", "Critical", ""];

function cleanString(value) {
  return String(value ?? "").trim();
}

function uploadedFileData(file) {
  if (!file) return {};
  return {
    fileUrl: `/uploads/${file.filename}`,
    fileName: cleanString(file.originalname || file.filename),
  };
}

function escapeRegex(value = "") {
  return cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message = "Lab report not found.") {
  return res.status(404).json({ success: false, message });
}

function resolveClerkUserId(req) {
  try {
    const auth = req.auth || {};
    const fromReq = auth?.userId || auth?.user_id || auth?.user?.id || req.user?.id || null;
    if (fromReq) return fromReq;
    try {
      return getAuth(req)?.userId || null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function populateReport(query) {
  return query
    .populate("patientId", "patientCode name email phone age gender clerkUserId")
    .populate("requestedByDoctorId", "name email specialization imageUrl")
    .populate("uploadedByStaffId", "name email department status")
    .populate("appointmentId", "date time status doctorName speciality")
    .populate("admissionId", "admissionDate status reasonForAdmission")
    .populate("serviceAppointmentId", "serviceName date status");
}

function normalizeResults(raw = []) {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item = {}) => ({
      testName: cleanString(item.testName),
      value: cleanString(item.value),
      unit: cleanString(item.unit),
      referenceRange: cleanString(item.referenceRange),
      flag: FLAGS.includes(cleanString(item.flag)) ? cleanString(item.flag) : "",
    }))
    .filter((item) => item.testName || item.value || item.unit || item.referenceRange || item.flag);
}

function hasUsefulResultPayload(body = {}) {
  return Boolean(
      normalizeResults(body.results).length ||
      cleanString(body.resultSummary) ||
      cleanString(body.interpretation) ||
      cleanString(body.notes) ||
      cleanString(body.status)
  );
}

function buildFilter(query = {}, base = {}) {
  const filter = { ...base };
  const testType = cleanString(query.testType || query.type);
  const status = cleanString(query.status);
  const patientId = cleanString(query.patientId);
  const doctorId = cleanString(query.doctorId || query.requestedByDoctorId);
  const search = cleanString(query.search);

  if (TEST_TYPES.includes(testType)) filter.testType = testType;
  if (STATUSES.includes(status)) filter.status = status;
  if (patientId && isValidObjectId(patientId)) filter.patientId = patientId;
  if (doctorId && isValidObjectId(doctorId)) filter.requestedByDoctorId = doctorId;
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { reportCode: re },
      { title: re },
      { description: re },
      { specimen: re },
      { resultSummary: re },
      { interpretation: re },
      { fileName: re },
    ];
  }

  return filter;
}

async function getCurrentPatient(req, res) {
  const clerkUserId = resolveClerkUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ success: false, message: "Patient authentication required." });
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

async function normalizeCreatePayload(req, actor = {}) {
  const body = req.body || {};
  const patientId = cleanString(body.patientId);
  const title = cleanString(body.title);
  const testType = cleanString(body.testType);

  if (!patientId) return { error: "patientId is required." };
  if (!isValidObjectId(patientId)) return { error: "Invalid patientId." };
  if (!testType || !TEST_TYPES.includes(testType)) return { error: "Invalid testType." };
  if (!title) return { error: "Title is required." };

  const patient = await PatientProfile.findById(patientId).lean();
  if (!patient) return { error: "Patient profile not found." };

  let requestedByDoctorId = cleanString(body.requestedByDoctorId || body.doctorId);
  if (actor.type === "Doctor") requestedByDoctorId = cleanString(actor.id);
  if (requestedByDoctorId) {
    if (!isValidObjectId(requestedByDoctorId)) return { error: "Invalid requestedByDoctorId." };
    const doctor = await Doctor.exists({ _id: requestedByDoctorId });
    if (!doctor) return { error: "Doctor not found." };
  }

  const appointmentRef = await validateOptionalRef(Appointment, body.appointmentId, "appointmentId");
  if (appointmentRef.error) return { error: appointmentRef.error };
  const admissionRef = await validateOptionalRef(Admission, body.admissionId, "admissionId");
  if (admissionRef.error) return { error: admissionRef.error };
  const serviceAppointmentRef = await validateOptionalRef(ServiceAppointment, body.serviceAppointmentId, "serviceAppointmentId");
  if (serviceAppointmentRef.error) return { error: serviceAppointmentRef.error };

  const requestedDate = parseDate(body.requestedDate) || new Date();
  const resultDate = parseDate(body.resultDate);
  if (body.resultDate && !resultDate) return { error: "Invalid resultDate." };

  const status = cleanString(body.status) || (actor.type === "Doctor" ? "Requested" : "Completed");
  if (!STATUSES.includes(status)) return { error: "Invalid status." };

  return {
    patient,
    data: {
      patientId,
      requestedByDoctorId: requestedByDoctorId || null,
      uploadedByStaffId: actor.type === "Staff" ? actor.id : null,
      appointmentId: appointmentRef.value,
      admissionId: admissionRef.value,
      serviceAppointmentId: serviceAppointmentRef.value,
      testType,
      title,
      description: cleanString(body.description),
      specimen: cleanString(body.specimen),
      requestedDate,
      resultDate,
      results: normalizeResults(body.results),
      resultSummary: cleanString(body.resultSummary),
      interpretation: cleanString(body.interpretation),
      fileUrl: uploadedFileData(req.file).fileUrl || "",
      fileName: uploadedFileData(req.file).fileName || "",
      status,
      notes: cleanString(body.notes),
    },
  };
}

function notifyPatient(report, title, message, eventName) {
  void createPatientNotification({
    patientId: report.patientId,
    title,
    message,
    type: "Report",
    link: "/my-lab-reports",
    createdByRole: report.uploadedByStaffId ? "Staff" : "Doctor",
    createdById: cleanString(report.uploadedByStaffId || report.requestedByDoctorId || ""),
    dedupeKey: `labReport:${report._id}:${eventName}`,
    metadata: {
      reportId: String(report._id),
      reportCode: report.reportCode,
    },
  });
}

async function createReport(req, res, actor) {
  const normalized = await normalizeCreatePayload(req, actor);
  if (normalized.error) return badRequest(res, normalized.error);

  const report = await LabReport.create(normalized.data);
  if (actor.type === "Doctor") {
    notifyPatient(report, "Lab test requested", "Your doctor requested a lab test.", "requested");
  } else if (["Completed", "Reviewed"].includes(report.status) || report.fileUrl || report.results.length) {
    notifyPatient(report, "Lab result uploaded", "A new lab result is available in your account.", "result-uploaded");
  }

  const populated = await populateReport(LabReport.findById(report._id)).lean();
  return res.status(201).json({ success: true, message: "Lab report created successfully.", data: populated });
}

export async function requestLabReport(req, res) {
  try {
    const doctorId = req.doctor?._id || req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: "Doctor authentication required." });
    return await createReport(req, res, { type: "Doctor", id: doctorId });
  } catch (err) {
    console.error("requestLabReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while requesting lab test." });
  }
}

export async function createStaffLabReport(req, res) {
  try {
    const staffId = req.staff?._id || req.staff?.id;
    if (!staffId) return res.status(401).json({ success: false, message: "Staff authentication required." });
    return await createReport(req, res, { type: "Staff", id: staffId });
  } catch (err) {
    console.error("createStaffLabReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while creating lab report." });
  }
}

export async function createAdminLabReport(req, res) {
  try {
    return await createReport(req, res, { type: "Admin", id: req.admin?.userId || "" });
  } catch (err) {
    console.error("createAdminLabReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while creating lab report." });
  }
}

export async function getMyLabReports(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;
    const reports = await populateReport(
      LabReport.find(buildFilter(req.query, { patientId: patient._id })).sort({ requestedDate: -1, createdAt: -1 })
    ).lean();
    return res.json({ success: true, message: "Lab reports loaded successfully.", data: reports });
  } catch (err) {
    console.error("getMyLabReports error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading lab reports." });
  }
}

export async function getMyLabReportById(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid lab report id.");
    const report = await populateReport(LabReport.findOne({ _id: id, patientId: patient._id })).lean();
    if (!report) return notFound(res);
    return res.json({ success: true, message: "Lab report loaded successfully.", data: report });
  } catch (err) {
    console.error("getMyLabReportById error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading lab report." });
  }
}

export async function getDoctorLabReports(req, res) {
  try {
    const doctorId = req.doctor?._id || req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: "Doctor authentication required." });
    const reports = await populateReport(
      LabReport.find(buildFilter(req.query, { requestedByDoctorId: doctorId })).sort({ requestedDate: -1, createdAt: -1 })
    ).lean();
    return res.json({ success: true, message: "Lab reports loaded successfully.", data: reports });
  } catch (err) {
    console.error("getDoctorLabReports error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading lab reports." });
  }
}

export async function getDoctorLabReportById(req, res) {
  try {
    const doctorId = req.doctor?._id || req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: "Doctor authentication required." });
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid lab report id.");
    const report = await populateReport(LabReport.findOne({ _id: id, requestedByDoctorId: doctorId })).lean();
    if (!report) return notFound(res);
    return res.json({ success: true, message: "Lab report loaded successfully.", data: report });
  } catch (err) {
    console.error("getDoctorLabReportById error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading lab report." });
  }
}

export async function getStaffLabReports(req, res) {
  try {
    const reports = await populateReport(
      LabReport.find(buildFilter(req.query)).sort({ requestedDate: -1, createdAt: -1 })
    ).lean();
    return res.json({ success: true, message: "Lab reports loaded successfully.", data: reports });
  } catch (err) {
    console.error("getStaffLabReports error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading lab reports." });
  }
}

export async function updateLabReportResult(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid lab report id.");
    if (!hasUsefulResultPayload(req.body) && !req.file) return badRequest(res, "At least one result field is required.");

    const report = await LabReport.findById(id);
    if (!report) return notFound(res);

    if (req.body?.results !== undefined) report.results = normalizeResults(req.body.results);
    ["resultSummary", "interpretation", "notes", "specimen"].forEach((field) => {
      if (req.body?.[field] !== undefined) report[field] = cleanString(req.body[field]);
    });
    if (req.file) {
      const fileData = uploadedFileData(req.file);
      report.fileUrl = fileData.fileUrl;
      report.fileName = fileData.fileName;
    }
    if (req.body?.status !== undefined) {
      const status = cleanString(req.body.status);
      if (!STATUSES.includes(status)) return badRequest(res, "Invalid status.");
      report.status = status;
    }
    if (req.body?.resultDate !== undefined) {
      const resultDate = parseDate(req.body.resultDate);
      if (!resultDate) return badRequest(res, "Invalid resultDate.");
      report.resultDate = resultDate;
    }
    if (report.status === "Completed" && !report.resultDate) report.resultDate = new Date();
    if (req.staff?._id) report.uploadedByStaffId = req.staff._id;

    await report.save();
    if (report.status === "Completed" || report.fileUrl || report.results.length) {
      notifyPatient(report, "Lab result uploaded", "A new lab result is available in your account.", "result-uploaded");
    }

    const populated = await populateReport(LabReport.findById(report._id)).lean();
    return res.json({ success: true, message: "Lab result updated successfully.", data: populated });
  } catch (err) {
    console.error("updateLabReportResult error:", err);
    return res.status(500).json({ success: false, message: "Server error while updating lab result." });
  }
}

export async function updateLabReportStatus(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid lab report id.");
    const status = cleanString(req.body?.status);
    if (!STATUSES.includes(status)) return badRequest(res, "Invalid status.");

    const report = await LabReport.findById(id);
    if (!report) return notFound(res);
    report.status = status;
    if (status === "Completed" && !report.resultDate) report.resultDate = new Date();
    if (req.staff?._id) report.uploadedByStaffId = req.staff._id;
    await report.save();
    if (status === "Completed") {
      notifyPatient(report, "Lab result uploaded", "A new lab result is available in your account.", "result-uploaded");
    }

    const populated = await populateReport(LabReport.findById(report._id)).lean();
    return res.json({ success: true, message: `Lab report marked ${status}.`, data: populated });
  } catch (err) {
    console.error("updateLabReportStatus error:", err);
    return res.status(500).json({ success: false, message: "Server error while updating lab report status." });
  }
}

export async function updateAdminLabReport(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid lab report id.");
    const report = await LabReport.findById(id);
    if (!report) return notFound(res);

    ["title", "description", "specimen", "resultSummary", "interpretation", "notes"].forEach((field) => {
      if (req.body?.[field] !== undefined) report[field] = cleanString(req.body[field]);
    });
    if (req.file) {
      const fileData = uploadedFileData(req.file);
      report.fileUrl = fileData.fileUrl;
      report.fileName = fileData.fileName;
    }
    if (req.body?.results !== undefined) report.results = normalizeResults(req.body.results);
    if (req.body?.testType !== undefined) {
      const testType = cleanString(req.body.testType);
      if (!TEST_TYPES.includes(testType)) return badRequest(res, "Invalid testType.");
      report.testType = testType;
    }
    if (req.body?.status !== undefined) {
      const status = cleanString(req.body.status);
      if (!STATUSES.includes(status)) return badRequest(res, "Invalid status.");
      report.status = status;
    }
    if (req.body?.resultDate !== undefined) {
      const resultDate = parseDate(req.body.resultDate);
      if (!resultDate) return badRequest(res, "Invalid resultDate.");
      report.resultDate = resultDate;
    }
    if (report.status === "Completed" && !report.resultDate) report.resultDate = new Date();

    await report.save();
    if (report.status === "Completed" || report.fileUrl || report.results.length) {
      notifyPatient(report, "Lab result uploaded", "A new lab result is available in your account.", "result-uploaded");
    }
    const populated = await populateReport(LabReport.findById(report._id)).lean();
    return res.json({ success: true, message: "Lab report updated successfully.", data: populated });
  } catch (err) {
    console.error("updateAdminLabReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while updating lab report." });
  }
}

export async function getAdminLabReports(req, res) {
  try {
    const reports = await populateReport(
      LabReport.find(buildFilter(req.query)).sort({ requestedDate: -1, createdAt: -1 })
    ).lean();
    return res.json({ success: true, message: "Lab reports loaded successfully.", data: reports });
  } catch (err) {
    console.error("getAdminLabReports error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading lab reports." });
  }
}

export async function getAdminLabReportById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid lab report id.");
    const report = await populateReport(LabReport.findById(id)).lean();
    if (!report) return notFound(res);
    return res.json({ success: true, message: "Lab report loaded successfully.", data: report });
  } catch (err) {
    console.error("getAdminLabReportById error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading lab report." });
  }
}

export async function deleteLabReport(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid lab report id.");
    const report = await LabReport.findById(id);
    if (!report) return notFound(res);
    await report.deleteOne();
    return res.json({ success: true, message: "Lab report deleted successfully.", data: { _id: id } });
  } catch (err) {
    console.error("deleteLabReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while deleting lab report." });
  }
}
