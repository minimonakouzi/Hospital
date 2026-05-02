import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import Nurse from "../models/Nurse.js";
import Staff from "../models/Staff.js";
import Appointment from "../models/Appointment.js";
import ServiceAppointment from "../models/serviceAppointment.js";
import PerformanceAttendance from "../models/staffAttendanceModel.js";

const ROLES = ["Doctor", "Nurse", "Staff"];
const SHIFTS = ["Morning", "Evening", "Night", "Rotating", "Unassigned"];
const STATUSES = ["Present", "Absent", "Late", "On Leave"];
const ALL_ROLES = "All Roles";
const ALL_DEPARTMENTS = "All Departments";
const ALL_SHIFTS = "All Shifts";
const ALL_STATUSES = "All Statuses";

function cleanString(value) {
  return String(value ?? "").trim();
}

function escapeRegex(value) {
  return cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMatch(value) {
  return cleanString(value).toLowerCase();
}

function firstString(source = {}, paths = [], fallback = "") {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], source);
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return fallback;
}

function isAll(value, allLabel) {
  const cleaned = cleanString(value);
  return !cleaned || cleaned === "All" || cleaned === allLabel;
}

function getMonthNumber(value) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const numeric = Number(cleaned);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;
  const parsed = new Date(`${cleaned} 1, 2000`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getMonth() + 1;
}

function buildDateRange(query = {}) {
  const year = Number(query.year);
  const month = getMonthNumber(query.month);
  const day = cleanString(query.day);
  const numericDay = day && day !== "All Days" ? Number(day) : null;

  if (!Number.isInteger(year)) return null;

  const startMonth = month ? month - 1 : 0;
  const start = new Date(Date.UTC(year, startMonth, numericDay || 1));
  let end;

  if (month && Number.isInteger(numericDay) && numericDay >= 1 && numericDay <= 31) {
    end = new Date(Date.UTC(year, startMonth, numericDay + 1));
  } else if (month) {
    end = new Date(Date.UTC(year, startMonth + 1, 1));
  } else {
    end = new Date(Date.UTC(year + 1, 0, 1));
  }

  return { start, end };
}

function buildAttendanceFilter(query = {}, options = {}) {
  const { includeStatus = true } = options;
  const filter = {};

  if (!isAll(query.role, ALL_ROLES)) {
    filter.role = cleanString(query.role);
  }
  if (!isAll(query.department, ALL_DEPARTMENTS)) {
    filter.department = new RegExp(`^${escapeRegex(query.department)}$`, "i");
  }
  if (!isAll(query.shiftType, ALL_SHIFTS)) {
    filter.shiftType = new RegExp(`^${escapeRegex(query.shiftType)}$`, "i");
  }
  if (includeStatus && !isAll(query.status, ALL_STATUSES)) {
    filter.status = cleanString(query.status);
  }

  const range = buildDateRange(query);
  if (range) filter.date = { $gte: range.start, $lt: range.end };

  return filter;
}

function isActiveRecord(record = {}) {
  const checks = ["isActive", "active", "available", "availability"];

  for (const field of checks) {
    if (record[field] === undefined || record[field] === null) continue;
    if (typeof record[field] === "boolean") return record[field];
    const value = normalizeMatch(record[field]);
    return !["false", "no", "inactive", "unavailable", "0"].includes(value);
  }

  if (record.status !== undefined && record.status !== null) {
    return ["active", "available"].includes(normalizeMatch(record.status));
  }

  return true;
}

function mapPerson(record = {}, role) {
  return {
    _id: String(record._id || ""),
    name: firstString(record, ["name", "fullName", "doctorName", "nurseName"], "Unnamed"),
    role,
    department: firstString(
      record,
      ["department", "speciality", "specialty", "roleDepartment", "specialization"],
      "Unassigned",
    ),
    shiftType: firstString(
      record,
      ["shiftType", "shift", "workingShift", "schedule.shiftType"],
      "Unassigned",
    ),
    email: firstString(record, ["email", "contactEmail"], ""),
    phone: firstString(record, ["phone", "mobile", "contactNumber"], ""),
  };
}

function matchesPeopleFilters(person = {}, query = {}) {
  if (!isAll(query.role, ALL_ROLES) && person.role !== cleanString(query.role)) return false;
  if (
    !isAll(query.department, ALL_DEPARTMENTS) &&
    normalizeMatch(person.department) !== normalizeMatch(query.department)
  ) {
    return false;
  }
  if (
    !isAll(query.shiftType, ALL_SHIFTS) &&
    normalizeMatch(person.shiftType) !== normalizeMatch(query.shiftType)
  ) {
    return false;
  }
  return true;
}

function roundPercent(numerator, denominator) {
  if (!denominator) return 0;
  const value = (numerator / denominator) * 100;
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function average(items = [], field) {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
  return Math.round(total / items.length) || 0;
}

function attendanceScore(status) {
  if (status === "Present") return 100;
  if (status === "Late") return 70;
  if (status === "On Leave") return 50;
  return 0;
}

function performanceScore(status, workloadCount) {
  const workloadScore = Math.min(100, Math.max(0, Number(workloadCount || 0) * 10));
  const score = attendanceScore(status) * 0.7 + workloadScore * 0.3;
  return Number.isFinite(score) ? Math.round(score) : 0;
}

function latestAttendanceByPerson(attendance = []) {
  const map = new Map();
  attendance.forEach((record) => {
    const key = `${record.role || record.staffModel}:${String(record.staffId || "")}`;
    if (!map.has(key)) map.set(key, record);
  });
  return map;
}

async function loadPeople(query = {}) {
  const [doctors, nurses, staff] = await Promise.all([
    Doctor.find().select("-password").lean(),
    Nurse.find().select("-password").lean(),
    Staff.find().select("-password").lean(),
  ]);

  return [
    ...doctors.filter(isActiveRecord).map((item) => mapPerson(item, "Doctor")),
    ...nurses.filter(isActiveRecord).map((item) => mapPerson(item, "Nurse")),
    ...staff.filter(isActiveRecord).map((item) => mapPerson(item, "Staff")),
  ].filter((person) => matchesPeopleFilters(person, query));
}

async function loadWorkloadCounts() {
  const [doctorWorkloads, nurseDoctorChecks, nurseServiceChecks] = await Promise.all([
    Appointment.aggregate([
      { $match: { doctorId: { $ne: null } } },
      { $group: { _id: "$doctorId", count: { $sum: 1 } } },
    ]),
    Appointment.aggregate([
      { $match: { checkedInByNurseId: { $ne: null } } },
      { $group: { _id: "$checkedInByNurseId", count: { $sum: 1 } } },
    ]),
    ServiceAppointment.aggregate([
      { $match: { checkedInByNurseId: { $ne: null } } },
      { $group: { _id: "$checkedInByNurseId", count: { $sum: 1 } } },
    ]),
  ]);

  const counts = new Map();
  doctorWorkloads.forEach((item) => counts.set(`Doctor:${item._id}`, item.count || 0));
  nurseDoctorChecks.forEach((item) => counts.set(`Nurse:${item._id}`, item.count || 0));
  nurseServiceChecks.forEach((item) => {
    const key = `Nurse:${item._id}`;
    counts.set(key, (counts.get(key) || 0) + (item.count || 0));
  });

  return counts;
}

function buildRoleBreakdown(records = []) {
  return ROLES.map((role) => {
    const roleRecords = records.filter((record) => record.role === role);
    const present = roleRecords.filter((record) => record.attendanceStatus === "Present").length;
    const absent = roleRecords.filter((record) => record.attendanceStatus === "Absent").length;

    return {
      role,
      total: roleRecords.length,
      present,
      absent,
      utilizationPercent: roundPercent(present, roleRecords.length),
      averagePerformanceScore: average(roleRecords, "performanceScore"),
    };
  });
}

function buildDepartmentUtilization(records = []) {
  const departments = [...new Set(records.map((record) => record.department || "Unassigned"))];
  return departments.map((department) => {
    const departmentRecords = records.filter((record) => record.department === department);
    const present = departmentRecords.filter((record) => record.attendanceStatus === "Present").length;

    return {
      department,
      total: departmentRecords.length,
      present,
      utilizationPercent: roundPercent(present, departmentRecords.length),
      averagePerformanceScore: average(departmentRecords, "performanceScore"),
    };
  });
}

function buildShiftDistribution(records = []) {
  return SHIFTS.map((shiftType) => ({
    shiftType,
    count: records.filter((record) => (record.shiftType || "Unassigned") === shiftType).length,
  }));
}

function formatTrendLabel(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return cleanString(dateValue);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function buildAttendanceTrend(attendance = []) {
  const grouped = new Map();
  attendance.forEach((record) => {
    const key = new Date(record.date).toISOString().slice(0, 10);
    if (!grouped.has(key)) {
      grouped.set(key, { label: formatTrendLabel(record.date), present: 0, absent: 0, late: 0, onLeave: 0 });
    }
    const item = grouped.get(key);
    if (record.status === "Present") item.present += 1;
    else if (record.status === "Late") item.late += 1;
    else if (record.status === "On Leave") item.onLeave += 1;
    else item.absent += 1;
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);
}

function attentionReason(record = {}) {
  if (record.attendanceStatus === "Absent") return "Absent today";
  if (record.attendanceStatus === "Late") return "Late attendance";
  if (record.performanceScore < 50) return "Low performance score";
  return "";
}

export async function getPerformanceSummary(req, res) {
  try {
    const people = await loadPeople(req.query);
    const attendanceFilter = buildAttendanceFilter(req.query, { includeStatus: false });
    const attendance = await PerformanceAttendance.find(attendanceFilter)
      .sort({ date: -1, createdAt: -1 })
      .lean();
    const attendanceMap = latestAttendanceByPerson(attendance);
    const workloadCounts = await loadWorkloadCounts();

    let records = people.map((person) => {
      const attendanceRecord = attendanceMap.get(`${person.role}:${person._id}`);
      const attendanceStatus = attendanceRecord?.status || "Absent";
      const workloadCount = workloadCounts.get(`${person.role}:${person._id}`) || 0;
      const score = performanceScore(attendanceStatus, workloadCount);

      return {
        _id: person._id,
        name: person.name,
        role: person.role,
        department: attendanceRecord?.department || person.department,
        shiftType: attendanceRecord?.shiftType || person.shiftType,
        attendanceStatus,
        utilizationPercent: attendanceStatus === "Present" ? 100 : 0,
        performanceScore: score,
        workloadCount,
        email: person.email,
        phone: person.phone,
      };
    });

    if (!isAll(req.query.status, ALL_STATUSES)) {
      records = records.filter((record) => record.attendanceStatus === cleanString(req.query.status));
    }

    const presentCount = records.filter((record) => record.attendanceStatus === "Present").length;
    const lateCount = records.filter((record) => record.attendanceStatus === "Late").length;
    const onLeaveCount = records.filter((record) => record.attendanceStatus === "On Leave").length;
    const absentCount = records.filter((record) => record.attendanceStatus === "Absent").length;
    const attentionNeeded = records
      .map((record) => ({ ...record, reason: attentionReason(record) }))
      .filter((record) => record.reason)
      .sort((a, b) => a.performanceScore - b.performanceScore)
      .slice(0, 5)
      .map(({ _id, name, role, department, performanceScore, attendanceStatus, reason }) => ({
        _id,
        name,
        role,
        department,
        performanceScore,
        attendanceStatus,
        reason,
      }));

    const topPerformers = [...records]
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5)
      .map(({ _id, name, role, department, performanceScore, attendanceStatus, workloadCount }) => ({
        _id,
        name,
        role,
        department,
        performanceScore,
        attendanceStatus,
        workloadCount,
      }));

    return res.json({
      success: true,
      overview: {
        totalPeople: records.length,
        totalDoctors: records.filter((record) => record.role === "Doctor").length,
        totalNurses: records.filter((record) => record.role === "Nurse").length,
        totalStaff: records.filter((record) => record.role === "Staff").length,
        presentCount,
        absentCount,
        lateCount,
        onLeaveCount,
        overallUtilizationPercent: roundPercent(presentCount, records.length),
        averagePerformanceScore: average(records, "performanceScore"),
      },
      roleBreakdown: buildRoleBreakdown(records),
      attendanceTrend: buildAttendanceTrend(attendance),
      shiftDistribution: buildShiftDistribution(records),
      departmentUtilization: buildDepartmentUtilization(records),
      topPerformers,
      attentionNeeded,
      records,
    });
  } catch (err) {
    console.error("getPerformanceSummary error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading performance summary.",
    });
  }
}

export async function getPerformanceAttendance(req, res) {
  try {
    const records = await PerformanceAttendance.find(buildAttendanceFilter(req.query))
      .sort({ date: -1, createdAt: -1 })
      .lean();
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error("getPerformanceAttendance error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading performance attendance.",
    });
  }
}

function normalizeAttendanceInput(body = {}, partial = false) {
  const data = {};

  if (!partial || body.staffId !== undefined) data.staffId = cleanString(body.staffId);
  if (!partial || body.staffModel !== undefined) data.staffModel = cleanString(body.staffModel);
  if (!partial || body.name !== undefined) data.name = cleanString(body.name);
  if (!partial || body.role !== undefined) data.role = cleanString(body.role);
  if (!partial || body.department !== undefined) data.department = cleanString(body.department) || "Unassigned";
  if (!partial || body.shiftType !== undefined) data.shiftType = cleanString(body.shiftType) || "Unassigned";
  if (!partial || body.status !== undefined) data.status = cleanString(body.status) || "Absent";
  if (!partial || body.date !== undefined) {
    const date = body.date ? new Date(body.date) : null;
    data.date = date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (!partial || body.checkInTime !== undefined) data.checkInTime = cleanString(body.checkInTime);
  if (!partial || body.checkOutTime !== undefined) data.checkOutTime = cleanString(body.checkOutTime);
  if (!partial || body.notes !== undefined) data.notes = cleanString(body.notes);

  return data;
}

function validateAttendanceInput(data = {}, partial = false) {
  if (data.staffId !== undefined && !mongoose.Types.ObjectId.isValid(data.staffId)) {
    return "staffId must be a valid MongoDB ObjectId.";
  }

  if (!partial) {
    const missing = ["staffId", "staffModel", "name", "role", "date"].filter((field) => !data[field]);
    if (missing.length) return `Missing required fields: ${missing.join(", ")}`;
  }

  if (data.staffModel !== undefined && !ROLES.includes(data.staffModel)) {
    return "staffModel must be Doctor, Nurse, or Staff.";
  }
  if (data.role !== undefined && !ROLES.includes(data.role)) {
    return "role must be Doctor, Nurse, or Staff.";
  }
  if (data.status !== undefined && !STATUSES.includes(data.status)) {
    return "status must be Present, Absent, Late, or On Leave.";
  }
  if (data.date === null) return "date must be valid.";

  return "";
}

export async function createPerformanceAttendance(req, res) {
  try {
    const data = normalizeAttendanceInput(req.body);
    const validationMessage = validateAttendanceInput(data);
    if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

    const record = await PerformanceAttendance.create(data);
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message || "Invalid attendance data." });
    }
    console.error("createPerformanceAttendance error:", err);
    return res.status(500).json({ success: false, message: "Server error while creating performance attendance." });
  }
}

export async function updatePerformanceAttendance(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid attendance id." });
    }

    const data = normalizeAttendanceInput(req.body, true);
    const validationMessage = validateAttendanceInput(data, true);
    if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

    const record = await PerformanceAttendance.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true },
    );
    if (!record) return res.status(404).json({ success: false, message: "Attendance record not found." });

    return res.json({ success: true, data: record });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message || "Invalid attendance data." });
    }
    console.error("updatePerformanceAttendance error:", err);
    return res.status(500).json({ success: false, message: "Server error while updating performance attendance." });
  }
}

export async function deletePerformanceAttendance(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid attendance id." });
    }

    const record = await PerformanceAttendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Attendance record not found." });

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error("deletePerformanceAttendance error:", err);
    return res.status(500).json({ success: false, message: "Server error while deleting performance attendance." });
  }
}
