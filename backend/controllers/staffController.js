import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Staff from "../models/Staff.js";
import { createAuditLog } from "../utils/auditLog.js";

const VALID_STATUSES = ["Active", "Inactive"];

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value) {
  const cleaned = cleanString(value);
  return VALID_STATUSES.includes(cleaned) ? cleaned : "Active";
}

function sanitizeStaff(staff = {}) {
  const out = staff.toObject ? staff.toObject() : { ...staff };
  delete out.password;
  return out;
}

function normalizeStaffInput(body = {}, includePassword = false) {
  const data = {
    name: cleanString(body.name),
    email: cleanString(body.email).toLowerCase(),
    phone: cleanString(body.phone),
    department: cleanString(body.department),
    role: "staff",
    status: normalizeStatus(body.status),
  };

  if (includePassword || body.password !== undefined) {
    data.password = String(body.password ?? "").trim();
  }

  return data;
}

function requiredMissing(data, includePassword = false) {
  const missing = [];
  ["name", "email", "phone", "department"].forEach((field) => {
    if (!data[field]) missing.push(field);
  });
  if (includePassword && !data.password) missing.push("password");
  return missing;
}

function profileRequiredMissing(data) {
  const missing = [];
  ["name", "phone", "department"].forEach((field) => {
    if (!data[field]) missing.push(field);
  });
  return missing;
}

function duplicateMessage(error) {
  const fields = Object.keys(error?.keyPattern || {});
  const message = String(error?.message || "");
  if (fields.includes("email") || message.includes("email")) {
    return "A staff member with this email already exists.";
  }
  return "Duplicate staff record.";
}

function isDuplicateKey(error) {
  return error?.code === 11000 || String(error?.message || "").includes("E11000");
}

export async function createStaff(req, res) {
  try {
    const data = normalizeStaffInput(req.body, true);
    const missing = requiredMissing(data, true);

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

    const existing = await Staff.findOne({ email: data.email }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A staff member with this email already exists.",
      });
    }

    const staff = await Staff.create({
      ...data,
      createdByAdminClerkId: req.admin?.userId || null,
    });
    await createAuditLog(req, {
      action: "staff.created",
      entityType: "staff",
      entityId: staff._id,
      details: {
        name: staff.name,
        email: staff.email,
        department: staff.department,
        status: staff.status,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Staff member created successfully.",
      data: sanitizeStaff(staff),
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      return res.status(409).json({
        success: false,
        message: duplicateMessage(err),
      });
    }

    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid staff data.",
      });
    }

    console.error("createStaff error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating staff member.",
    });
  }
}

export async function getStaff(req, res) {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      message: "Staff loaded successfully.",
      data: staff,
    });
  } catch (err) {
    console.error("getStaff error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading staff.",
    });
  }
}

export async function getStaffById(req, res) {
  try {
    const staff = await Staff.findById(req.params.id).lean();
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    return res.json({
      success: true,
      message: "Staff member loaded successfully.",
      data: staff,
    });
  } catch (err) {
    console.error("getStaffById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading staff member.",
    });
  }
}

export async function updateStaff(req, res) {
  try {
    const staff = await Staff.findById(req.params.id).select("+password");
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    const data = normalizeStaffInput(req.body);
    const missing = requiredMissing(data, false);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    staff.name = data.name;
    staff.email = data.email;
    staff.phone = data.phone;
    staff.department = data.department;
    staff.status = data.status;
    staff.role = "staff";

    if (data.password) {
      if (data.password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters.",
        });
      }
      staff.password = data.password;
    }

    await staff.save();
    await createAuditLog(req, {
      action: "staff.updated",
      entityType: "staff",
      entityId: staff._id,
      details: {
        name: staff.name,
        email: staff.email,
        department: staff.department,
        status: staff.status,
        passwordChanged: Boolean(data.password),
      },
    });

    return res.json({
      success: true,
      message: "Staff member updated successfully.",
      data: sanitizeStaff(staff),
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      return res.status(409).json({
        success: false,
        message: duplicateMessage(err),
      });
    }

    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid staff data.",
      });
    }

    console.error("updateStaff error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating staff member.",
    });
  }
}

export async function updateStaffStatus(req, res) {
  try {
    const status = cleanString(req.body?.status);
    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive.",
      });
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    staff.status = status;
    await staff.save();
    await createAuditLog(req, {
      action: "staff.updated",
      entityType: "staff",
      entityId: staff._id,
      details: {
        name: staff.name,
        email: staff.email,
        status,
      },
    });

    return res.json({
      success: true,
      message: `Staff account marked ${status}.`,
      data: sanitizeStaff(staff),
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid staff status.",
      });
    }

    console.error("updateStaffStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating staff status.",
    });
  }
}

export async function staffLogin(req, res) {
  try {
    const email = cleanString(req.body?.email).toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const staff = await Staff.findOne({ email }).select("+password");
    if (!staff || !staff.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff credentials.",
      });
    }

    if (staff.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact admin.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, staff.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff credentials.",
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
        id: staff._id.toString(),
        email: staff.email,
        role: "staff",
      },
      secret,
      { expiresIn: "7d" },
    );

    return res.json({
      success: true,
      message: "Staff login successful.",
      token,
      data: sanitizeStaff(staff),
    });
  } catch (err) {
    console.error("staffLogin error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during staff login.",
    });
  }
}

export async function getStaffMe(req, res) {
  try {
    return res.json({
      success: true,
      message: "Staff profile loaded successfully.",
      data: sanitizeStaff(req.staff),
    });
  } catch (err) {
    console.error("getStaffMe error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading staff profile.",
    });
  }
}

export async function updateStaffMe(req, res) {
  try {
    const staff = req.staff;
    const updates = {
      name: cleanString(req.body?.name),
      phone: cleanString(req.body?.phone),
      department: cleanString(req.body?.department),
      status: normalizeStatus(req.body?.status || staff.status),
    };

    const missing = profileRequiredMissing(updates);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    staff.name = updates.name;
    staff.phone = updates.phone;
    staff.department = updates.department;
    staff.status = updates.status;
    await staff.save();
    await createAuditLog(req, {
      action: "staff.updated",
      entityType: "staff",
      entityId: staff._id,
      details: {
        name: staff.name,
        email: staff.email,
        department: staff.department,
        status: staff.status,
        selfService: true,
      },
    });

    return res.json({
      success: true,
      message: "Staff profile updated successfully.",
      data: sanitizeStaff(staff),
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid staff profile data.",
      });
    }

    console.error("updateStaffMe error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating staff profile.",
    });
  }
}

export async function changeStaffPassword(req, res) {
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

    const staff = await Staff.findById(req.staff?._id).select("+password");
    if (!staff || !staff.password) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    const currentMatches = await bcrypt.compare(currentPassword, staff.password);
    if (!currentMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    staff.password = newPassword;
    await staff.save();

    return res.json({
      success: true,
      message: "Password changed successfully.",
      data: sanitizeStaff(staff),
    });
  } catch (err) {
    console.error("changeStaffPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while changing password.",
    });
  }
}
