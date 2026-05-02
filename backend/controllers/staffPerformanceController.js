import mongoose from "mongoose";
import Staff from "../models/Staff.js";
import StaffAttendance from "../models/staffAttendanceModel.js";

const ROLES = ["Doctor", "Nurse", "Staff"];
const SHIFTS = ["Morning", "Evening", "Night", "Rotating"];
const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "On Leave"];
const ALL_DEPARTMENTS = "All Departments";
const ALL_SHIFTS = "All Shifts";

function cleanString(value) {
  return String(value ?? "").trim();
}

function firstString(source = {}, paths = [], fallback = "") {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], source);
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return fallback;
}

function normalizeMatch(value) {
  return cleanString(value).toLowerCase();
}

function isAll(value, allLabel) {
  const cleaned = cleanString(value);
  return !cleaned || cleaned === allLabel;
}

function getMonthNumber(value) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;

  const numeric = Number(cleaned);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;

  const parsed = new Date(`${cleaned} 1, 2000`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getMonth() + 1;
}

function buildAttendanceFilter(query = {}) {
  const filter = { staffModel: "Staff" };

  if (!isAll(query.department, ALL_DEPARTMENTS)) {
    filter.department = new RegExp(`^${escapeRegex(query.department)}$`, "i");
  }

  const shiftType = query.shiftType ?? query.shift;
  if (!isAll(shiftType, ALL_SHIFTS)) {
    filter.shiftType = new RegExp(`^${escapeRegex(shiftType)}$`, "i");
  }

  const year = Number(query.year);
  const month = getMonthNumber(query.month);
  const day = cleanString(query.day);
  const numericDay = day && day !== "All Days" ? Number(day) : null;

  if (Number.isInteger(year)) {
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

    filter.date = { $gte: start, $lt: end };
  }

  return filter;
}

function escapeRegex(value) {
  return cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isActiveRecord(record = {}) {
  const checks = ["isActive", "active", "available"];

  for (const field of checks) {
    if (record[field] === undefined || record[field] === null) continue;
    if (typeof record[field] === "boolean") return record[field];
    const value = normalizeMatch(record[field]);
    return !["false", "no", "inactive", "unavailable", "0"].includes(value);
  }

  if (record.status !== undefined && record.status !== null) {
    return ["active", "available"].includes(normalizeMatch(record.status));
  }

  if (record.availability !== undefined && record.availability !== null) {
    return ["available", "active", "true", "yes", "1"].includes(
      normalizeMatch(record.availability),
    );
  }

  return true;
}

function mapStaffMember(record = {}) {
  return {
    _id: String(record._id || ""),
    name: firstString(
      record,
      ["name", "fullName"],
      "Unnamed Staff",
    ),
    role: "Staff",
    department: firstString(
      record,
      ["department", "roleDepartment"],
      "Unassigned",
    ),
    shiftType: firstString(
      record,
      ["shiftType", "shift", "workingShift", "schedule.shiftType"],
      "Unassigned",
    ),
    email: firstString(record, ["email", "contactEmail"], ""),
    phone: firstString(record, ["phone", "mobile", "contactNumber"], ""),
    source: record,
  };
}

function matchesStaffFilters(staff = {}, query = {}) {
  if (!isAll(query.department, ALL_DEPARTMENTS)) {
    if (normalizeMatch(staff.department) !== normalizeMatch(query.department)) return false;
  }

  const shiftType = query.shiftType ?? query.shift;
  if (!isAll(shiftType, ALL_SHIFTS)) {
    if (normalizeMatch(staff.shiftType) !== normalizeMatch(shiftType)) return false;
  }

  return true;
}

function roundPercent(numerator, denominator) {
  if (!denominator) return 0;
  const percent = (numerator / denominator) * 100;
  return Number.isFinite(percent) ? Math.round(percent) : 0;
}

function countBy(items = [], field) {
  return items.reduce((acc, item) => {
    const key = item[field] || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function loadActiveStaff(query = {}) {
  const staff = await Staff.find().select("-password").lean();

  return staff
    .filter(isActiveRecord)
    .map(mapStaffMember)
    .filter((item) => matchesStaffFilters(item, query));
}

export async function getStaffPerformanceSummary(req, res) {
  try {
    const allStaff = await loadActiveStaff(req.query);
    const attendanceFilter = buildAttendanceFilter(req.query);
    const attendanceRecords = await StaffAttendance.find(attendanceFilter)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const activeStaffIds = new Set(allStaff.map((item) => `${item.role}:${item._id}`));
    const relevantAttendance = attendanceRecords.filter((record) =>
      activeStaffIds.has(`${record.staffModel || record.role}:${String(record.staffId || "")}`),
    );
    const attendanceByStaff = new Map();
    relevantAttendance.forEach((record) => {
      const key = `Staff:${String(record.staffId || "")}`;
      if (!attendanceByStaff.has(key)) attendanceByStaff.set(key, record);
    });

    const statusForStaff = (member) =>
      attendanceByStaff.get(`Staff:${member._id}`)?.status || "Absent";

    const staffPresent = allStaff.filter((member) => statusForStaff(member) === "Present").length;
    const staffLate = allStaff.filter((member) => statusForStaff(member) === "Late").length;
    const staffOnLeave = allStaff.filter((member) => statusForStaff(member) === "On Leave").length;
    const staffAbsent = Math.max(0, allStaff.length - staffPresent - staffLate - staffOnLeave);
    const shiftCounts = countBy(allStaff, "shiftType");

    const departments = [...new Set(allStaff.map((item) => item.department || "Unassigned"))];
    const utilizationByDepartment = departments.map((department) => {
      const departmentStaff = allStaff.filter((item) => item.department === department);
      const activeStaffCount = departmentStaff.filter(
        (member) => statusForStaff(member) === "Present",
      ).length;

      return {
        department,
        utilizationPercent: roundPercent(activeStaffCount, departmentStaff.length),
        activeStaff: activeStaffCount,
        totalStaff: departmentStaff.length,
      };
    });

    const staffRecords = allStaff.map((member) => {
      const attendance = attendanceByStaff.get(`Staff:${member._id}`);
      const attendanceStatus = attendance?.status || "Absent";

      return {
        _id: member._id,
        name: member.name,
        role: member.role,
        department: attendance?.department || member.department,
        shiftType: attendance?.shiftType || member.shiftType,
        attendanceStatus,
        utilizationPercent: attendanceStatus === "Present" ? 100 : 0,
        email: member.email,
        phone: member.phone,
      };
    });

    return res.json({
      success: true,
      overview: {
        totalStaff: allStaff.length,
        numberOfDoctors: 0,
        numberOfNurses: 0,
        staffPresent,
        staffAbsent,
        staffLate,
        staffOnLeave,
        staffUtilizationPercent: roundPercent(staffPresent, allStaff.length),
      },
      shiftDistribution: [...SHIFTS, "Unassigned"].map((shiftType) => ({
        shiftType,
        count: shiftCounts[shiftType] || 0,
      })),
      presentByRole: ROLES.map((role) => ({
        role,
        count: role === "Staff" ? staffPresent : 0,
      })),
      utilizationByDepartment,
      staffRecords,
    });
  } catch (err) {
    console.error("getStaffPerformanceSummary error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading staff performance summary.",
    });
  }
}

export async function getStaffAttendanceRecords(req, res) {
  try {
    const records = await StaffAttendance.find(buildAttendanceFilter(req.query))
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    console.error("getStaffAttendanceRecords error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading staff attendance records.",
    });
  }
}

function normalizeAttendanceInput(body = {}, partial = false) {
  const data = {};

  if (!partial || body.staffId !== undefined) data.staffId = cleanString(body.staffId);
  if (!partial || body.staffModel !== undefined) data.staffModel = cleanString(body.staffModel);
  if (!partial || body.name !== undefined) data.name = cleanString(body.name);
  if (!partial || body.role !== undefined) data.role = cleanString(body.role);
  if (!partial || body.department !== undefined) {
    data.department = cleanString(body.department) || "Unassigned";
  }
  if (!partial || body.shiftType !== undefined) {
    data.shiftType = cleanString(body.shiftType) || "Unassigned";
  }
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

  const required = ["staffId", "staffModel", "name", "role", "date"];
  if (!partial) {
    const missing = required.filter((field) => !data[field]);
    if (missing.length) return `Missing required fields: ${missing.join(", ")}`;
  }

  if (data.staffModel !== undefined && data.staffModel !== "Staff") {
    return "staffModel must be Staff for staff performance attendance.";
  }
  if (data.role !== undefined && data.role !== "Staff") {
    return "role must be Staff for staff performance attendance.";
  }
  if (data.status !== undefined && !ATTENDANCE_STATUSES.includes(data.status)) {
    return "status must be Present, Absent, Late, or On Leave.";
  }
  if (data.date === null) return "date must be valid.";

  return "";
}

export async function createStaffAttendanceRecord(req, res) {
  try {
    const data = normalizeAttendanceInput(req.body);
    const validationMessage = validateAttendanceInput(data);

    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const record = await StaffAttendance.create(data);
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid attendance data.",
      });
    }

    console.error("createStaffAttendanceRecord error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating staff attendance.",
    });
  }
}

export async function updateStaffAttendanceRecord(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid attendance id." });
    }

    const data = normalizeAttendanceInput(req.body, true);
    const validationMessage = validateAttendanceInput(data, true);

    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const record = await StaffAttendance.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record not found." });
    }

    return res.json({ success: true, data: record });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid attendance data.",
      });
    }

    console.error("updateStaffAttendanceRecord error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating staff attendance.",
    });
  }
}

export async function deleteStaffAttendanceRecord(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid attendance id." });
    }

    const record = await StaffAttendance.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record not found." });
    }

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error("deleteStaffAttendanceRecord error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting staff attendance.",
    });
  }
}
