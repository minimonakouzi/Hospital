import mongoose from "mongoose";
import { getAuth } from "@clerk/express";
import PatientNotification from "../models/PatientNotification.js";

const NOTIFICATION_TYPES = ["Appointment", "Prescription", "Report", "Ticket", "Billing", "System"];

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

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, parsed));
}

function authError(res) {
  return res.status(401).json({
    success: false,
    message: "Patient authentication required.",
  });
}

export async function getMyPatientNotifications(req, res) {
  try {
    const clerkUserId = resolveClerkUserId(req);
    if (!clerkUserId) return authError(res);

    const status = String(req.query?.status || "All").trim();
    const type = String(req.query?.type || "").trim();
    const limit = parseLimit(req.query?.limit);
    const filter = { clerkUserId };

    if (status === "Unread") filter.readAt = null;
    if (status === "Read") filter.readAt = { $ne: null };
    if (type && type !== "All" && NOTIFICATION_TYPES.includes(type)) {
      filter.type = type;
    }

    const [notifications, unreadCount] = await Promise.all([
      PatientNotification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      PatientNotification.countDocuments({ clerkUserId, readAt: null }),
    ]);

    return res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (err) {
    console.error("getMyPatientNotifications error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading notifications.",
    });
  }
}

export async function markPatientNotificationRead(req, res) {
  try {
    const clerkUserId = resolveClerkUserId(req);
    if (!clerkUserId) return authError(res);

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id.",
      });
    }

    const notification = await PatientNotification.findOneAndUpdate(
      { _id: id, clerkUserId },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.json({
      success: true,
      data: notification,
    });
  } catch (err) {
    console.error("markPatientNotificationRead error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while marking notification as read.",
    });
  }
}

export async function markAllPatientNotificationsRead(req, res) {
  try {
    const clerkUserId = resolveClerkUserId(req);
    if (!clerkUserId) return authError(res);

    const result = await PatientNotification.updateMany(
      { clerkUserId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return res.json({
      success: true,
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (err) {
    console.error("markAllPatientNotificationsRead error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while marking notifications as read.",
    });
  }
}
