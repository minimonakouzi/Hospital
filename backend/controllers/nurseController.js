import Nurse from "../models/Nurse.js";
import Appointment from "../models/Appointment.js";
import ServiceAppointment from "../models/serviceAppointment.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createAuditLog } from "../utils/auditLog.js";

const VALID_SHIFTS = ["Morning", "Evening", "Night", "Rotating"];
const VALID_STATUSES = ["Active", "On Leave", "Inactive"];

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeEnum(value, validValues, fallback = "") {
  const cleaned = cleanString(value);
  return validValues.includes(cleaned) ? cleaned : fallback;
}

function normalizeNurseInput(body = {}) {
  const clerkUserId = cleanString(body.clerkUserId);

  const data = {
    name: cleanString(body.name),
    email: cleanString(body.email).toLowerCase(),
    password: String(body.password ?? "").trim(),
    phone: cleanString(body.phone),
    department: cleanString(body.department),
    shift: normalizeEnum(body.shift, VALID_SHIFTS),
    experience: cleanString(body.experience),
    specialization: cleanString(body.specialization),
    status: normalizeEnum(body.status, VALID_STATUSES, "Active"),
    notes: cleanString(body.notes),
    clerkUserId: clerkUserId || null,
  };

  return data;
}

function sanitizeNurse(nurse = {}) {
  const out = nurse.toObject ? nurse.toObject() : { ...nurse };
  delete out.password;
  return out;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeMatchText(value) {
  return cleanString(value).toLowerCase();
}

function matchesDepartment(values = [], department = "") {
  const normalizedDepartment = normalizeMatchText(department);
  if (!normalizedDepartment) return false;
  return values.some((value) => {
    const normalizedValue = normalizeMatchText(value);
    return (
      normalizedValue &&
      (normalizedValue.includes(normalizedDepartment) ||
        normalizedDepartment.includes(normalizedValue))
    );
  });
}

function serviceTime(appointment = {}) {
  if (!appointment) return "";
  const hour = Number(appointment.hour);
  const minute = Number(appointment.minute);
  const ampm = appointment.ampm || "";
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || !ampm) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function mapDoctorAppointment(appointment = {}) {
  const doctor = appointment.doctorId || {};
  return {
    id: String(appointment._id || ""),
    type: "doctor",
    patientName: appointment.patientName || "",
    mobile: appointment.mobile || "",
    age: appointment.age ?? null,
    gender: appointment.gender || "",
    date: appointment.date || "",
    time: appointment.time || "",
    status: appointment.status || "",
    paymentStatus: appointment.payment?.status || "",
    paymentMethod: appointment.payment?.method || "",
    amount: appointment.fees ?? appointment.payment?.amount ?? 0,
    doctorName: appointment.doctorName || doctor.name || "",
    speciality:
      appointment.speciality ||
      doctor.specialization ||
      doctor.speciality ||
      "",
    checkInStatus: appointment.checkInStatus || "Not Checked In",
    checkedInAt: appointment.checkedInAt || null,
    checkedInByNurseId: appointment.checkedInByNurseId || null,
  };
}

function mapServiceAppointment(appointment = {}) {
  const service = appointment.serviceId || {};
  return {
    id: String(appointment._id || ""),
    type: "service",
    patientName: appointment.patientName || "",
    mobile: appointment.mobile || "",
    age: appointment.age ?? null,
    gender: appointment.gender || "",
    date: appointment.date || "",
    time: serviceTime(appointment),
    status: appointment.status || "",
    paymentStatus: appointment.payment?.status || "",
    paymentMethod: appointment.payment?.method || "",
    amount: appointment.fees ?? appointment.payment?.amount ?? 0,
    serviceName: appointment.serviceName || service.name || "",
    checkInStatus: appointment.checkInStatus || "Not Checked In",
    checkedInAt: appointment.checkedInAt || null,
    checkedInByNurseId: appointment.checkedInByNurseId || null,
  };
}

function validateRequired(data, includePassword = false) {
  const missing = [];
  ["name", "email", "phone", "department", "shift"].forEach((field) => {
    if (!data[field]) missing.push(field);
  });
  if (includePassword && !data.password) missing.push("password");
  return missing;
}

function duplicateMessage(error) {
  const fields = Object.keys(error?.keyPattern || {});
  const message = String(error?.message || "");
  if (fields.includes("email")) return "A nurse with this email already exists.";
  if (fields.includes("nurseCode")) return "A nurse with this Nurse ID already exists.";
  if (message.includes("email")) return "A nurse with this email already exists.";
  if (message.includes("nurseCode")) return "A nurse with this Nurse ID already exists.";
  return "Duplicate nurse record.";
}

function isDuplicateKeyMessage(err) {
  return err?.code === 11000 || String(err?.message || "").includes("E11000");
}

function createErrorMessage(err) {
  if (!err) return "Server error while creating nurse.";
  if (err.name === "ValidationError") return err.message;
  if (err.name === "MongoServerError" || err.name === "MongooseError") {
    return err.message || "Database error while creating nurse.";
  }
  return err.message || "Server error while creating nurse.";
}

export async function createNurse(req, res) {
  try {
    const data = normalizeNurseInput(req.body);
    const missing = validateRequired(data, true);

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    if (data.password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const existingByEmail = await Nurse.findOne({ email: data.email }).lean();
    if (existingByEmail) {
      return res.status(409).json({
        success: false,
        message: "A nurse with this email already exists.",
      });
    }

    const createPayload = {
      ...data,
      createdByAdminClerkId: req.admin?.userId || null,
    };

    const nurse = await Nurse.create(createPayload);
    await createAuditLog(req, {
      action: "nurse.created",
      entityType: "nurse",
      entityId: nurse._id,
      details: {
        name: nurse.name,
        email: nurse.email,
        department: nurse.department,
        shift: nurse.shift,
        status: nurse.status,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Nurse created successfully.",
      data: sanitizeNurse(nurse),
    });
  } catch (err) {
    if (isDuplicateKeyMessage(err)) {
      return res.status(409).json({
        success: false,
        message: duplicateMessage(err),
      });
    }

    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid nurse data.",
      });
    }

    console.error("createNurse error:", err);
    return res.status(500).json({
      success: false,
      message: createErrorMessage(err),
    });
  }
}

export async function getNurses(req, res) {
  try {
    const nurses = await Nurse.find().sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      message: "Nurses loaded successfully.",
      data: nurses,
    });
  } catch (err) {
    console.error("getNurses error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading nurses.",
    });
  }
}

export async function nurseLogin(req, res) {
  try {
    const email = cleanString(req.body?.email).toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const nurse = await Nurse.findOne({ email }).select("+password");
    if (!nurse) {
      return res.status(401).json({
        success: false,
        message: "Invalid nurse credentials.",
      });
    }

    if (!nurse.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid nurse credentials.",
      });
    }

    if (nurse.status && nurse.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact admin.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, nurse.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid nurse credentials.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured.",
      });
    }

    const token = jwt.sign(
      {
        id: nurse._id.toString(),
        email: nurse.email,
        role: "nurse",
      },
      secret,
      { expiresIn: "7d" },
    );

    return res.json({
      success: true,
      message: "Nurse login successful.",
      token,
      data: sanitizeNurse(nurse),
    });
  } catch (err) {
    console.error("nurseLogin error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during nurse login.",
    });
  }
}

export async function getNurseMe(req, res) {
  try {
    return res.json({
      success: true,
      message: "Nurse profile loaded successfully.",
      data: sanitizeNurse(req.nurse),
    });
  } catch (err) {
    console.error("getNurseMe error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading nurse profile.",
    });
  }
}

export async function updateNurseMe(req, res) {
  try {
    const nurse = req.nurse;
    const updates = {
      name: cleanString(req.body?.name),
      phone: cleanString(req.body?.phone),
      department: cleanString(req.body?.department),
      shift: normalizeEnum(req.body?.shift, VALID_SHIFTS, nurse.shift || "Morning"),
      status: normalizeEnum(req.body?.status, VALID_STATUSES, nurse.status || "Active"),
      specialization: cleanString(req.body?.specialization),
      experience: cleanString(req.body?.experience),
      notes: cleanString(req.body?.notes),
    };

    const missing = [];
    ["name", "phone", "department", "shift"].forEach((field) => {
      if (!updates[field]) missing.push(field);
    });

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    Object.assign(nurse, updates);
    await nurse.save();
    await createAuditLog(req, {
      action: "nurse.updated",
      entityType: "nurse",
      entityId: nurse._id,
      details: {
        name: nurse.name,
        email: nurse.email,
        department: nurse.department,
        shift: nurse.shift,
        status: nurse.status,
        selfService: true,
      },
    });

    return res.json({
      success: true,
      message: "Nurse profile updated successfully.",
      data: sanitizeNurse(nurse),
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid nurse profile data.",
      });
    }

    console.error("updateNurseMe error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating nurse profile.",
    });
  }
}

export async function updateNurseStatus(req, res) {
  try {
    const status = cleanString(req.body?.status);
    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive.",
      });
    }

    const nurse = await Nurse.findById(req.params.id);
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: "Nurse not found.",
      });
    }

    nurse.status = status;
    await nurse.save();
    await createAuditLog(req, {
      action: "nurse.updated",
      entityType: "nurse",
      entityId: nurse._id,
      details: {
        name: nurse.name,
        email: nurse.email,
        status,
      },
    });

    return res.json({
      success: true,
      message: `Nurse account marked ${status}.`,
      data: sanitizeNurse(nurse),
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid nurse status.",
      });
    }

    console.error("updateNurseStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating nurse status.",
    });
  }
}

export async function changeNursePassword(req, res) {
  try {
    const { currentPassword = "", newPassword = "", confirmPassword = "" } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password, new password, and confirm password are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters.",
      });
    }

    const nurse = await Nurse.findById(req.nurse?._id).select("+password");
    if (!nurse || !nurse.password) {
      return res.status(404).json({
        success: false,
        message: "Nurse not found.",
      });
    }

    const currentMatches = await bcrypt.compare(currentPassword, nurse.password);
    if (!currentMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    nurse.password = newPassword;
    await nurse.save();

    return res.json({
      success: true,
      message: "Password changed successfully.",
      data: sanitizeNurse(nurse),
    });
  } catch (err) {
    console.error("changeNursePassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while changing password.",
    });
  }
}

export async function getNurseCheckInQueue(req, res) {
  try {
    const today = todayString();
    const activeDoctorStatuses = { $nin: ["Canceled", "Completed"] };
    const activeServiceStatuses = { $nin: ["Canceled", "Cancelled", "Completed"] };

    const [doctorAppointments, serviceAppointments] = await Promise.all([
      Appointment.find({ date: today, status: activeDoctorStatuses })
        .sort({ time: 1, createdAt: -1 })
        .limit(120)
        .populate("doctorId", "name specialization")
        .lean(),
      ServiceAppointment.find({ date: today, status: activeServiceStatuses })
        .sort({ hour: 1, minute: 1, createdAt: -1 })
        .limit(120)
        .populate("serviceId", "name shortDescription")
        .lean(),
    ]);

    const queue = [
      ...doctorAppointments.map(mapDoctorAppointment),
      ...serviceAppointments.map(mapServiceAppointment),
    ].sort((a, b) => `${a.time || ""}`.localeCompare(`${b.time || ""}`));

    return res.json({
      success: true,
      message: "Check-in queue loaded successfully.",
      data: {
        date: today,
        queue,
        counts: {
          total: queue.length,
          checkedIn: queue.filter((item) => item.checkInStatus === "Checked In").length,
          pending: queue.filter((item) => item.checkInStatus !== "Checked In").length,
        },
      },
    });
  } catch (err) {
    console.error("getNurseCheckInQueue error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading check-in queue.",
    });
  }
}

export async function markNurseCheckIn(req, res) {
  try {
    const { type, id } = req.params;
    const today = todayString();
    const Model = type === "doctor" ? Appointment : type === "service" ? ServiceAppointment : null;

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Check-in type must be doctor or service.",
      });
    }

    const appointment = await Model.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    if (appointment.date !== today) {
      return res.status(400).json({
        success: false,
        message: "Only today's appointments can be checked in.",
      });
    }

    if (["Canceled", "Cancelled", "Completed"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "This appointment cannot be checked in.",
      });
    }

    if (appointment.checkInStatus === "Checked In") {
      return res.json({
        success: true,
        message: "Patient is already checked in.",
        data:
          type === "doctor"
            ? mapDoctorAppointment(appointment.toObject())
            : mapServiceAppointment(appointment.toObject()),
      });
    }

    appointment.checkInStatus = "Checked In";
    appointment.checkedInAt = new Date();
    appointment.checkedInByNurseId = req.nurse._id;
    await appointment.save();
    await createAuditLog(req, {
      action: "patient.checked_in",
      entityType: type === "doctor" ? "appointment" : "serviceAppointment",
      entityId: appointment._id,
      details: {
        appointmentType: type,
        patientName: appointment.patientName || "",
        mobile: appointment.mobile || "",
        date: appointment.date || "",
      },
    });

    return res.json({
      success: true,
      message: "Patient checked in successfully.",
      data:
        type === "doctor"
          ? mapDoctorAppointment(appointment.toObject())
          : mapServiceAppointment(appointment.toObject()),
    });
  } catch (err) {
    console.error("markNurseCheckIn error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while checking in patient.",
    });
  }
}

export async function getNurseDashboard(req, res) {
  try {
    const nurse = sanitizeNurse(req.nurse);
    const department = nurse.department || "";
    const today = todayString();
    const activeStatuses = { $nin: ["Canceled", "Cancelled", "Completed"] };

    const [todayDoctorRaw, upcomingDoctorRaw, todayServiceRaw, upcomingServiceRaw] =
      await Promise.all([
        Appointment.find({ date: today, status: activeStatuses })
          .sort({ time: 1, createdAt: -1 })
          .limit(80)
          .populate("doctorId", "name specialization")
          .lean(),
        Appointment.find({ date: { $gte: today }, status: activeStatuses })
          .sort({ date: 1, time: 1, createdAt: -1 })
          .limit(80)
          .populate("doctorId", "name specialization")
          .lean(),
        ServiceAppointment.find({ date: today, status: activeStatuses })
          .sort({ hour: 1, minute: 1, createdAt: -1 })
          .limit(80)
          .populate("serviceId", "name shortDescription about")
          .lean(),
        ServiceAppointment.find({ date: { $gte: today }, status: activeStatuses })
          .sort({ date: 1, hour: 1, minute: 1, createdAt: -1 })
          .limit(80)
          .populate("serviceId", "name shortDescription about")
          .lean(),
      ]);

    const filterDoctorByDepartment = (appointment) =>
      matchesDepartment(
        [
          appointment.speciality,
          appointment.doctorName,
          appointment.doctorId?.specialization,
          appointment.doctorId?.name,
        ],
        department,
      );

    const filterServiceByDepartment = (appointment) =>
      matchesDepartment(
        [
          appointment.serviceName,
          appointment.serviceId?.name,
          appointment.serviceId?.shortDescription,
          appointment.serviceId?.about,
        ],
        department,
      );

    const departmentDoctorToday = todayDoctorRaw.filter(filterDoctorByDepartment);
    const departmentDoctorUpcoming = upcomingDoctorRaw.filter(filterDoctorByDepartment);
    const departmentServiceToday = todayServiceRaw.filter(filterServiceByDepartment);
    const departmentServiceUpcoming = upcomingServiceRaw.filter(filterServiceByDepartment);

    const hasDepartment = Boolean(cleanString(department));
    const usedDepartmentFilter =
      hasDepartment &&
      (departmentDoctorToday.length > 0 ||
        departmentDoctorUpcoming.length > 0 ||
        departmentServiceToday.length > 0 ||
        departmentServiceUpcoming.length > 0);

    const todayDoctorAppointments = (
      usedDepartmentFilter ? departmentDoctorToday : todayDoctorRaw
    )
      .slice(0, 12)
      .map(mapDoctorAppointment);
    const upcomingDoctorAppointments = (
      usedDepartmentFilter ? departmentDoctorUpcoming : upcomingDoctorRaw
    )
      .slice(0, 12)
      .map(mapDoctorAppointment);
    const todayServiceAppointments = (
      usedDepartmentFilter ? departmentServiceToday : todayServiceRaw
    )
      .slice(0, 12)
      .map(mapServiceAppointment);
    const upcomingServiceAppointments = (
      usedDepartmentFilter ? departmentServiceUpcoming : upcomingServiceRaw
    )
      .slice(0, 12)
      .map(mapServiceAppointment);

    const recentUpcomingAppointments = [
      ...upcomingDoctorAppointments,
      ...upcomingServiceAppointments,
    ]
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, 8);
    const checkedInToday = [
      ...todayDoctorAppointments,
      ...todayServiceAppointments,
    ].filter((appointment) => appointment.checkInStatus === "Checked In").length;

    return res.json({
      success: true,
      message: "Nurse dashboard loaded successfully.",
      data: {
        nurse: {
          id: String(nurse._id || nurse.id || ""),
          nurseCode: nurse.nurseCode || "",
          name: nurse.name || "",
          email: nurse.email || "",
          phone: nurse.phone || "",
          department: nurse.department || "",
          shift: nurse.shift || "",
          status: nurse.status || "Active",
          specialization: nurse.specialization || "",
          experience: nurse.experience || "",
          notes: nurse.notes || "",
        },
        meta: {
          date: today,
          department,
          departmentFilterApplied: usedDepartmentFilter,
          fallbackReason: usedDepartmentFilter
            ? ""
            : "No direct nurse assignment or department match exists on appointment records yet, so this read-only dashboard uses today's active records as a fallback.",
        },
        counts: {
          checkIns: checkedInToday,
          appointments: todayDoctorAppointments.length,
          bookings: todayServiceAppointments.length,
          vitals: 0,
        },
        todayDoctorAppointments,
        todayServiceAppointments,
        recentUpcomingAppointments,
        checkIns: [],
        vitals: [],
      },
    });
  } catch (err) {
    console.error("getNurseDashboard error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading nurse dashboard.",
    });
  }
}
