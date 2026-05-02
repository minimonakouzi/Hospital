import mongoose from "mongoose";
import { getAuth } from "@clerk/express";
import Admission from "../models/Admission.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import PatientProfile from "../models/PatientProfile.js";
import RadiologyReport from "../models/RadiologyReport.js";
import ServiceAppointment from "../models/serviceAppointment.js";
import { createPatientNotification } from "../utils/createPatientNotification.js";

const REPORT_TYPES = ["X-Ray", "MRI", "CT Scan", "Ultrasound", "Other"];
const REPORT_STATUSES = ["Pending", "Completed", "Reviewed"];

function cleanString(value) {
  return String(value ?? "").trim();
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message = "Radiology report not found.") {
  return res.status(404).json({ success: false, message });
}

function resolveClerkUserId(req) {
  try {
    const auth = req.auth || {};
    const fromReq =
      auth?.userId ||
      auth?.user_id ||
      auth?.user?.id ||
      req.user?.id ||
      null;

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
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function escapeRegex(value = "") {
  return cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function populateReport(query) {
  return query
    .populate("patientId", "patientCode name email phone age gender clerkUserId")
    .populate("doctorId", "name email specialization imageUrl")
    .populate("appointmentId", "date time status doctorName speciality")
    .populate("admissionId", "admissionDate status reasonForAdmission")
    .populate("serviceAppointmentId", "serviceName date status");
}

function buildReportFilter(query = {}, baseFilter = {}) {
  const filter = { ...baseFilter };
  const reportType = cleanString(query.reportType || query.type);
  const status = cleanString(query.status);
  const patientId = cleanString(query.patientId);
  const doctorId = cleanString(query.doctorId);
  const search = cleanString(query.search);

  if (REPORT_TYPES.includes(reportType)) filter.reportType = reportType;
  if (REPORT_STATUSES.includes(status)) filter.status = status;
  if (patientId && isValidObjectId(patientId)) filter.patientId = patientId;
  if (doctorId && isValidObjectId(doctorId)) filter.doctorId = doctorId;
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { reportCode: re },
      { title: re },
      { description: re },
      { findings: re },
      { impression: re },
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

async function normalizeReportPayload(req, res, actor) {
  const body = req.body || {};
  const patientId = cleanString(body.patientId);
  const title = cleanString(body.title);
  const reportType = cleanString(body.reportType);

  if (!patientId) return { error: "patientId is required." };
  if (!isValidObjectId(patientId)) return { error: "Invalid patientId." };
  if (!reportType || !REPORT_TYPES.includes(reportType)) {
    return { error: "reportType must be X-Ray, MRI, CT Scan, Ultrasound, or Other." };
  }
  if (!title) return { error: "Title is required." };

  const patient = await PatientProfile.findById(patientId).lean();
  if (!patient) return { error: "Patient profile not found." };

  let doctorId = cleanString(body.doctorId);
  if (actor.type === "Doctor") doctorId = cleanString(actor.id);

  if (doctorId) {
    if (!isValidObjectId(doctorId)) return { error: "Invalid doctorId." };
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return { error: "Doctor not found." };
  }

  const appointmentRef = await validateOptionalRef(Appointment, body.appointmentId, "appointmentId");
  if (appointmentRef.error) return { error: appointmentRef.error };

  const admissionRef = await validateOptionalRef(Admission, body.admissionId, "admissionId");
  if (admissionRef.error) return { error: admissionRef.error };

  const serviceAppointmentRef = await validateOptionalRef(
    ServiceAppointment,
    body.serviceAppointmentId,
    "serviceAppointmentId"
  );
  if (serviceAppointmentRef.error) return { error: serviceAppointmentRef.error };

  const reportDate = parseDate(body.reportDate);
  if (body.reportDate && !reportDate) return { error: "Invalid reportDate." };

  const status = cleanString(body.status) || "Completed";
  if (!REPORT_STATUSES.includes(status)) {
    return { error: "Status must be Pending, Completed, or Reviewed." };
  }

  return {
    patient,
    data: {
      patientId,
      doctorId: doctorId || null,
      appointmentId: appointmentRef.value,
      admissionId: admissionRef.value,
      serviceAppointmentId: serviceAppointmentRef.value,
      uploadedByType: actor.type,
      uploadedById: cleanString(actor.id),
      reportType,
      title,
      description: cleanString(body.description),
      findings: cleanString(body.findings),
      impression: cleanString(body.impression),
      reportDate: reportDate || new Date(),
      fileUrl: cleanString(body.fileUrl),
      fileName: cleanString(body.fileName),
      status,
      notes: cleanString(body.notes),
    },
  };
}

function notifyPatient(report) {
  void createPatientNotification({
    patientId: report.patientId,
    title: "Radiology report uploaded",
    message: "A new radiology report is available in your account.",
    type: "Report",
    link: "/my-radiology-reports",
    createdByRole: report.uploadedByType,
    createdById: report.uploadedById,
    dedupeKey: `radiologyReport:${report._id}:uploaded`,
    metadata: {
      reportId: String(report._id),
      reportCode: report.reportCode,
    },
  });
}

async function createReport(req, res, actor) {
  const normalized = await normalizeReportPayload(req, res, actor);
  if (normalized.error) return badRequest(res, normalized.error);

  const report = await RadiologyReport.create(normalized.data);
  notifyPatient(report);

  const populated = await populateReport(RadiologyReport.findById(report._id)).lean();
  return res.status(201).json({
    success: true,
    message: "Radiology report created successfully.",
    data: populated,
  });
}

export async function createDoctorRadiologyReport(req, res) {
  try {
    const doctorId = req.doctor?._id || req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: "Doctor authentication required." });
    return await createReport(req, res, { type: "Doctor", id: doctorId });
  } catch (err) {
    console.error("createDoctorRadiologyReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while creating radiology report." });
  }
}

export async function createStaffRadiologyReport(req, res) {
  try {
    const staffId = req.staff?._id || req.staff?.id;
    if (!staffId) return res.status(401).json({ success: false, message: "Staff authentication required." });
    return await createReport(req, res, { type: "Staff", id: staffId });
  } catch (err) {
    console.error("createStaffRadiologyReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while creating radiology report." });
  }
}

export async function createAdminRadiologyReport(req, res) {
  try {
    return await createReport(req, res, { type: "Admin", id: req.admin?.userId || "" });
  } catch (err) {
    console.error("createAdminRadiologyReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while creating radiology report." });
  }
}

export async function getMyRadiologyReports(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;

    const reports = await populateReport(
      RadiologyReport.find(buildReportFilter(req.query, { patientId: patient._id }))
        .sort({ reportDate: -1, createdAt: -1 })
    ).lean();

    return res.json({ success: true, message: "Radiology reports loaded successfully.", data: reports });
  } catch (err) {
    console.error("getMyRadiologyReports error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading radiology reports." });
  }
}

export async function getMyRadiologyReportById(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;

    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid radiology report id.");

    const report = await populateReport(
      RadiologyReport.findOne({ _id: id, patientId: patient._id })
    ).lean();
    if (!report) return notFound(res);

    return res.json({ success: true, message: "Radiology report loaded successfully.", data: report });
  } catch (err) {
    console.error("getMyRadiologyReportById error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading radiology report." });
  }
}

export async function getDoctorRadiologyReports(req, res) {
  try {
    const doctorId = req.doctor?._id || req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: "Doctor authentication required." });

    const reports = await populateReport(
      RadiologyReport.find(
        buildReportFilter(req.query, {
          $or: [
            { doctorId },
            { uploadedByType: "Doctor", uploadedById: String(doctorId) },
          ],
        })
      ).sort({ reportDate: -1, createdAt: -1 })
    ).lean();

    return res.json({ success: true, message: "Radiology reports loaded successfully.", data: reports });
  } catch (err) {
    console.error("getDoctorRadiologyReports error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading radiology reports." });
  }
}

export async function getDoctorRadiologyReportById(req, res) {
  try {
    const doctorId = req.doctor?._id || req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: "Doctor authentication required." });

    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid radiology report id.");

    const report = await populateReport(
      RadiologyReport.findOne({
        _id: id,
        $or: [
          { doctorId },
          { uploadedByType: "Doctor", uploadedById: String(doctorId) },
        ],
      })
    ).lean();
    if (!report) return notFound(res);

    return res.json({ success: true, message: "Radiology report loaded successfully.", data: report });
  } catch (err) {
    console.error("getDoctorRadiologyReportById error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading radiology report." });
  }
}

export async function getStaffRadiologyReports(req, res) {
  try {
    const reports = await populateReport(
      RadiologyReport.find(buildReportFilter(req.query)).sort({ reportDate: -1, createdAt: -1 })
    ).lean();
    return res.json({ success: true, message: "Radiology reports loaded successfully.", data: reports });
  } catch (err) {
    console.error("getStaffRadiologyReports error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading radiology reports." });
  }
}

export async function updateStaffRadiologyReport(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid radiology report id.");

    const report = await RadiologyReport.findById(id);
    if (!report) return notFound(res);

    const allowed = [
      "title",
      "description",
      "findings",
      "impression",
      "fileUrl",
      "fileName",
      "notes",
    ];
    allowed.forEach((field) => {
      if (req.body?.[field] !== undefined) report[field] = cleanString(req.body[field]);
    });

    if (req.body?.reportType !== undefined) {
      const reportType = cleanString(req.body.reportType);
      if (!REPORT_TYPES.includes(reportType)) return badRequest(res, "Invalid reportType.");
      report.reportType = reportType;
    }
    if (req.body?.status !== undefined) {
      const status = cleanString(req.body.status);
      if (!REPORT_STATUSES.includes(status)) return badRequest(res, "Invalid status.");
      report.status = status;
    }
    if (req.body?.reportDate !== undefined) {
      const reportDate = parseDate(req.body.reportDate);
      if (!reportDate) return badRequest(res, "Invalid reportDate.");
      report.reportDate = reportDate;
    }

    await report.save();
    const populated = await populateReport(RadiologyReport.findById(report._id)).lean();
    return res.json({ success: true, message: "Radiology report updated successfully.", data: populated });
  } catch (err) {
    console.error("updateStaffRadiologyReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while updating radiology report." });
  }
}

export async function deleteRadiologyReport(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid radiology report id.");

    const report = await RadiologyReport.findById(id);
    if (!report) return notFound(res);

    await report.deleteOne();
    return res.json({ success: true, message: "Radiology report deleted successfully.", data: { _id: id } });
  } catch (err) {
    console.error("deleteRadiologyReport error:", err);
    return res.status(500).json({ success: false, message: "Server error while deleting radiology report." });
  }
}

export async function getAdminRadiologyReports(req, res) {
  try {
    const reports = await populateReport(
      RadiologyReport.find(buildReportFilter(req.query)).sort({ reportDate: -1, createdAt: -1 })
    ).lean();
    return res.json({ success: true, message: "Radiology reports loaded successfully.", data: reports });
  } catch (err) {
    console.error("getAdminRadiologyReports error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading radiology reports." });
  }
}

export async function getAdminRadiologyReportById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid radiology report id.");

    const report = await populateReport(RadiologyReport.findById(id)).lean();
    if (!report) return notFound(res);

    return res.json({ success: true, message: "Radiology report loaded successfully.", data: report });
  } catch (err) {
    console.error("getAdminRadiologyReportById error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading radiology report." });
  }
}
