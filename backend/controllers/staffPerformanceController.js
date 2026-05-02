import StaffPerformance from "../models/StaffPerformance.js";

const VALID_ROLES = ["Doctor", "Nurse", "Staff"];
const VALID_SHIFTS = ["Morning", "Evening", "Night"];
const VALID_ATTENDANCE = ["Present", "Absent"];
const VALID_PERFORMANCE_STATUSES = ["Excellent", "Good", "Needs Review"];

function cleanString(value) {
  return String(value ?? "").trim();
}

function parseNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthNumber(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;

  const parsed = new Date(`${value} 1, 2000`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getMonth() + 1;
}

function buildFilter(query = {}) {
  const filter = {};

  if (query.department && query.department !== "All Departments") {
    filter.department = cleanString(query.department);
  }

  if (query.shift && query.shift !== "All Shifts") {
    filter.shift = cleanString(query.shift);
  }

  if (query.role && query.role !== "All Roles") {
    filter.role = cleanString(query.role);
  }

  const year = Number(query.year);
  const month = getMonthNumber(query.month);
  const day =
    query.day && query.day !== "All Days" ? Number(query.day) : undefined;

  if (Number.isInteger(year)) {
    const startMonth = month ? month - 1 : 0;
    const endMonth = month ? month : 12;
    const startDay = Number.isInteger(day) ? day : 1;

    const start = new Date(Date.UTC(year, startMonth, startDay));
    let end;

    if (Number.isInteger(day) && month) {
      end = new Date(Date.UTC(year, startMonth, day + 1));
    } else if (month) {
      end = new Date(Date.UTC(year, endMonth, 1));
    } else {
      end = new Date(Date.UTC(year + 1, 0, 1));
    }

    filter.date = { $gte: start, $lt: end };
  }

  return filter;
}

function normalizeInput(body = {}, partial = false) {
  const data = {};

  if (!partial || body.staffId !== undefined) data.staffId = cleanString(body.staffId);
  if (!partial || body.staffName !== undefined) {
    data.staffName = cleanString(body.staffName);
  }
  if (!partial || body.role !== undefined) data.role = cleanString(body.role);
  if (!partial || body.department !== undefined) {
    data.department = cleanString(body.department);
  }
  if (!partial || body.shift !== undefined) data.shift = cleanString(body.shift);
  if (!partial || body.attendance !== undefined) {
    data.attendance = cleanString(body.attendance);
  }
  if (!partial || body.date !== undefined) data.date = normalizeDate(body.date);
  if (!partial || body.utilization !== undefined) {
    data.utilization = Math.min(100, Math.max(0, parseNumber(body.utilization)));
  }
  if (!partial || body.performanceStatus !== undefined) {
    data.performanceStatus = cleanString(body.performanceStatus) || "Good";
  }

  return data;
}

function validateRecordInput(data = {}, partial = false) {
  const missing = [];
  const required = [
    "staffId",
    "staffName",
    "role",
    "department",
    "shift",
    "attendance",
    "date",
    "utilization",
    "performanceStatus",
  ];

  if (!partial) {
    required.forEach((field) => {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        missing.push(field);
      }
    });
  }

  if (missing.length) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  if (data.role !== undefined && !VALID_ROLES.includes(data.role)) {
    return "Role must be Doctor, Nurse, or Staff.";
  }
  if (data.shift !== undefined && !VALID_SHIFTS.includes(data.shift)) {
    return "Shift must be Morning, Evening, or Night.";
  }
  if (
    data.attendance !== undefined &&
    !VALID_ATTENDANCE.includes(data.attendance)
  ) {
    return "Attendance must be Present or Absent.";
  }
  if (
    data.performanceStatus !== undefined &&
    !VALID_PERFORMANCE_STATUSES.includes(data.performanceStatus)
  ) {
    return "Performance status must be Excellent, Good, or Needs Review.";
  }
  if (data.date === null) return "Date must be valid.";
  if (
    data.utilization !== undefined &&
    (!Number.isFinite(data.utilization) ||
      data.utilization < 0 ||
      data.utilization > 100)
  ) {
    return "Utilization must be a number from 0 to 100.";
  }

  return "";
}

function mapCountObject(items, keyName = "_id") {
  return items.reduce((acc, item) => {
    acc[item[keyName] || "Other"] = item.count || 0;
    return acc;
  }, {});
}

export async function getStaffPerformanceRecords(req, res) {
  try {
    const records = await StaffPerformance.find(buildFilter(req.query))
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      message: "Staff performance records loaded successfully.",
      data: records,
    });
  } catch (err) {
    console.error("getStaffPerformanceRecords error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading staff performance records.",
    });
  }
}

export async function getStaffPerformanceSummary(req, res) {
  try {
    const filter = buildFilter(req.query);

    const [
      totalStaff,
      doctors,
      nurses,
      staff,
      staffPresent,
      utilizationAgg,
      shiftAgg,
      presentRoleAgg,
      departmentAgg,
    ] = await Promise.all([
      StaffPerformance.countDocuments(filter),
      StaffPerformance.countDocuments({ ...filter, role: "Doctor" }),
      StaffPerformance.countDocuments({ ...filter, role: "Nurse" }),
      StaffPerformance.countDocuments({ ...filter, role: "Staff" }),
      StaffPerformance.countDocuments({ ...filter, attendance: "Present" }),
      StaffPerformance.aggregate([
        { $match: filter },
        { $group: { _id: null, averageUtilization: { $avg: "$utilization" } } },
      ]),
      StaffPerformance.aggregate([
        { $match: filter },
        { $group: { _id: "$shift", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      StaffPerformance.aggregate([
        { $match: { ...filter, attendance: "Present" } },
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      StaffPerformance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$department",
            utilization: { $avg: "$utilization" },
            count: { $sum: 1 },
          },
        },
        { $sort: { utilization: -1 } },
      ]),
    ]);

    return res.json({
      success: true,
      message: "Staff performance summary loaded successfully.",
      data: {
        totalStaff,
        doctors,
        nurses,
        staff,
        staffPresent,
        utilization: Math.round(utilizationAgg[0]?.averageUtilization || 0),
        staffByShift: mapCountObject(shiftAgg),
        staffPresentByRole: mapCountObject(presentRoleAgg),
        utilizationByDepartment: departmentAgg.map((item) => ({
          department: item._id || "Other",
          utilization: Math.round(item.utilization || 0),
          count: item.count || 0,
        })),
      },
    });
  } catch (err) {
    console.error("getStaffPerformanceSummary error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading staff performance summary.",
    });
  }
}

export async function addStaffPerformanceRecord(req, res) {
  try {
    const data = normalizeInput(req.body);
    const validationMessage = validateRecordInput(data);

    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const record = await StaffPerformance.create(data);

    return res.status(201).json({
      success: true,
      message: "Staff performance record created successfully.",
      data: record,
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid staff performance data.",
      });
    }

    console.error("addStaffPerformanceRecord error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating staff performance record.",
    });
  }
}

export async function updateStaffPerformanceRecord(req, res) {
  try {
    const data = normalizeInput(req.body, true);
    const validationMessage = validateRecordInput(data, true);

    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const record = await StaffPerformance.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Staff performance record not found.",
      });
    }

    return res.json({
      success: true,
      message: "Staff performance record updated successfully.",
      data: record,
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid staff performance data.",
      });
    }

    console.error("updateStaffPerformanceRecord error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating staff performance record.",
    });
  }
}

export async function deleteStaffPerformanceRecord(req, res) {
  try {
    const record = await StaffPerformance.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Staff performance record not found.",
      });
    }

    return res.json({
      success: true,
      message: "Staff performance record deleted successfully.",
      data: record,
    });
  } catch (err) {
    console.error("deleteStaffPerformanceRecord error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting staff performance record.",
    });
  }
}
