import mongoose from "mongoose";
import { getAuth } from "@clerk/express";
import PatientProfile from "../models/PatientProfile.js";
import Staff from "../models/Staff.js";
import SupportTicket from "../models/SupportTicket.js";
import { createPatientNotification } from "../utils/createPatientNotification.js";

const CATEGORIES = [
  "Booking Problem",
  "Cancellation Help",
  "Payment Issue",
  "Medical Report",
  "General Question",
  "Other",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

function cleanString(value) {
  return String(value ?? "").trim();
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

function notFound(res, message = "Support ticket not found.") {
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

function patientDisplayName(patient = {}) {
  return (
    patient.name ||
    patient.email ||
    patient.phone ||
    patient.patientCode ||
    "Patient"
  );
}

function staffDisplayName(staff = {}) {
  return staff.name || staff.email || "Staff";
}

function normalizeCategory(value) {
  const cleaned = cleanString(value);
  return CATEGORIES.includes(cleaned) ? cleaned : "General Question";
}

function normalizePriority(value) {
  const cleaned = cleanString(value);
  return PRIORITIES.includes(cleaned) ? cleaned : "Medium";
}

function buildTicketFilter(query = {}, baseFilter = {}) {
  const filter = { ...baseFilter };
  const status = cleanString(query.status);
  const priority = cleanString(query.priority);
  const category = cleanString(query.category);
  const assignedStaffId = cleanString(query.assignedStaffId);
  const search = cleanString(query.search);

  if (STATUSES.includes(status)) filter.status = status;
  if (PRIORITIES.includes(priority)) filter.priority = priority;
  if (CATEGORIES.includes(category)) filter.category = category;
  if (assignedStaffId && isValidObjectId(assignedStaffId)) {
    filter.assignedStaffId = assignedStaffId;
  }
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { ticketCode: re },
      { subject: re },
      { category: re },
      { priority: re },
      { status: re },
      { "messages.message": re },
    ];
  }

  return filter;
}

function populateTicket(query) {
  return query
    .populate("patientId", "patientCode name email phone")
    .populate("assignedStaffId", "name email department status");
}

async function getCurrentPatient(req, res) {
  const clerkUserId = resolveClerkUserId(req);
  if (!clerkUserId) {
    res.status(401).json({
      success: false,
      message: "Patient authentication required.",
    });
    return null;
  }

  const patient = await PatientProfile.findOne({ clerkUserId }).lean();
  if (!patient) {
    res.status(404).json({
      success: false,
      message: "Patient profile not found. Please complete your profile before opening a support ticket.",
    });
    return null;
  }

  return patient;
}

function notifyTicketPatient(ticket, title, message, eventName) {
  void createPatientNotification({
    patientId: ticket.patientId,
    clerkUserId: ticket.clerkUserId,
    title,
    message,
    type: "Ticket",
    link: "/support",
    createdByRole: "Staff",
    createdById: cleanString(ticket.assignedStaffId || ""),
    dedupeKey: `supportTicket:${ticket._id}:${eventName}`,
    metadata: {
      ticketId: String(ticket._id),
      ticketCode: ticket.ticketCode,
      status: ticket.status,
    },
  });
}

export async function createSupportTicket(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;

    const subject = cleanString(req.body?.subject);
    const message = cleanString(req.body?.message);
    const priority = normalizePriority(req.body?.priority);
    const category = normalizeCategory(req.body?.category);

    if (!subject) return badRequest(res, "Subject is required.");
    if (!message) return badRequest(res, "Message is required.");

    const ticket = await SupportTicket.create({
      patientId: patient._id,
      clerkUserId: patient.clerkUserId,
      subject,
      category,
      priority,
      status: "Open",
      messages: [
        {
          senderType: "Patient",
          senderId: patient.clerkUserId,
          senderName: patientDisplayName(patient),
          message,
        },
      ],
    });

    const populated = await populateTicket(SupportTicket.findById(ticket._id)).lean();

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      data: populated,
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return badRequest(res, err.message || "Invalid support ticket data.");
    }

    console.error("createSupportTicket error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating support ticket.",
    });
  }
}

export async function getMySupportTickets(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;

    const tickets = await populateTicket(
      SupportTicket.find(buildTicketFilter(req.query, { clerkUserId: patient.clerkUserId }))
        .sort({ updatedAt: -1, createdAt: -1 })
    ).lean();

    return res.json({
      success: true,
      message: "Support tickets loaded successfully.",
      data: tickets,
    });
  } catch (err) {
    console.error("getMySupportTickets error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading support tickets.",
    });
  }
}

export async function getMySupportTicketById(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;

    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid support ticket id.");

    const ticket = await populateTicket(
      SupportTicket.findOne({ _id: id, clerkUserId: patient.clerkUserId })
    ).lean();
    if (!ticket) return notFound(res);

    return res.json({
      success: true,
      message: "Support ticket loaded successfully.",
      data: ticket,
    });
  } catch (err) {
    console.error("getMySupportTicketById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading support ticket.",
    });
  }
}

export async function replyToMySupportTicket(req, res) {
  try {
    const patient = await getCurrentPatient(req, res);
    if (!patient) return null;

    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid support ticket id.");

    const message = cleanString(req.body?.message);
    if (!message) return badRequest(res, "Message is required.");

    const ticket = await SupportTicket.findOne({ _id: id, clerkUserId: patient.clerkUserId });
    if (!ticket) return notFound(res);
    if (ticket.status === "Closed") {
      return badRequest(res, "Closed support tickets cannot receive new replies.");
    }

    ticket.messages.push({
      senderType: "Patient",
      senderId: patient.clerkUserId,
      senderName: patientDisplayName(patient),
      message,
    });

    if (ticket.status === "Resolved") {
      ticket.status = "Open";
    }

    await ticket.save();
    const populated = await populateTicket(SupportTicket.findById(ticket._id)).lean();

    return res.json({
      success: true,
      message:
        ticket.status === "Open"
          ? "Reply added successfully."
          : "Reply added successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("replyToMySupportTicket error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while replying to support ticket.",
    });
  }
}

export async function getSupportTickets(req, res) {
  try {
    const assignedStaffId = cleanString(req.query?.assignedStaffId);
    if (assignedStaffId && !isValidObjectId(assignedStaffId)) {
      return badRequest(res, "Invalid assignedStaffId.");
    }

    const tickets = await populateTicket(
      SupportTicket.find(buildTicketFilter(req.query))
        .sort({ updatedAt: -1, createdAt: -1 })
    ).lean();

    return res.json({
      success: true,
      message: "Support tickets loaded successfully.",
      data: tickets,
    });
  } catch (err) {
    console.error("getSupportTickets error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading support tickets.",
    });
  }
}

export async function getSupportTicketById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid support ticket id.");

    const ticket = await populateTicket(SupportTicket.findById(id)).lean();
    if (!ticket) return notFound(res);

    return res.json({
      success: true,
      message: "Support ticket loaded successfully.",
      data: ticket,
    });
  } catch (err) {
    console.error("getSupportTicketById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading support ticket.",
    });
  }
}

export async function replyToSupportTicket(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid support ticket id.");

    const message = cleanString(req.body?.message);
    if (!message) return badRequest(res, "Message is required.");

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return notFound(res);
    if (ticket.status === "Closed") {
      return badRequest(res, "Closed support tickets cannot receive new replies.");
    }

    const wasOpen = ticket.status === "Open";
    ticket.messages.push({
      senderType: "Staff",
      senderId: cleanString(req.staff?._id || req.staff?.id),
      senderName: staffDisplayName(req.staff),
      message,
    });
    if (wasOpen) ticket.status = "In Progress";
    if (!ticket.assignedStaffId && req.staff?._id) {
      ticket.assignedStaffId = req.staff._id;
    }

    await ticket.save();
    notifyTicketPatient(
      ticket,
      "Support ticket updated",
      `Your support ticket ${ticket.ticketCode} has a new reply.`,
      `reply:${ticket.messages.length}`
    );

    const populated = await populateTicket(SupportTicket.findById(ticket._id)).lean();

    return res.json({
      success: true,
      message: "Reply added successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("replyToSupportTicket error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while replying to support ticket.",
    });
  }
}

export async function updateSupportTicketStatus(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid support ticket id.");

    const status = cleanString(req.body?.status);
    if (!STATUSES.includes(status)) {
      return badRequest(res, "Status must be Open, In Progress, Resolved, or Closed.");
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return notFound(res);

    ticket.status = status;
    await ticket.save();
    notifyTicketPatient(
      ticket,
      "Support ticket status changed",
      `Your support ticket ${ticket.ticketCode} is now ${status}.`,
      `status:${status}`
    );

    const populated = await populateTicket(SupportTicket.findById(ticket._id)).lean();

    return res.json({
      success: true,
      message: `Support ticket marked ${status}.`,
      data: populated,
    });
  } catch (err) {
    console.error("updateSupportTicketStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating support ticket status.",
    });
  }
}

export async function updateSupportTicketPriority(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid support ticket id.");

    const priority = cleanString(req.body?.priority);
    if (!PRIORITIES.includes(priority)) {
      return badRequest(res, "Priority must be Low, Medium, High, or Urgent.");
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      { $set: { priority } },
      { new: true, runValidators: true }
    );
    if (!ticket) return notFound(res);

    const populated = await populateTicket(SupportTicket.findById(ticket._id)).lean();

    return res.json({
      success: true,
      message: `Support ticket priority set to ${priority}.`,
      data: populated,
    });
  } catch (err) {
    console.error("updateSupportTicketPriority error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating support ticket priority.",
    });
  }
}

export async function assignSupportTicket(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid support ticket id.");

    const requestedStaffId = cleanString(req.body?.assignedStaffId);
    const assignedStaffId = requestedStaffId || cleanString(req.staff?._id || req.staff?.id);
    if (!assignedStaffId || !isValidObjectId(assignedStaffId)) {
      return badRequest(res, "A valid assignedStaffId is required.");
    }

    const staff = await Staff.findById(assignedStaffId).lean();
    if (!staff) return notFound(res, "Assigned staff member not found.");
    if (staff.status === "Inactive") {
      return badRequest(res, "Inactive staff members cannot be assigned tickets.");
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      { $set: { assignedStaffId } },
      { new: true, runValidators: true }
    );
    if (!ticket) return notFound(res);

    const populated = await populateTicket(SupportTicket.findById(ticket._id)).lean();

    return res.json({
      success: true,
      message: "Support ticket assigned successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("assignSupportTicket error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while assigning support ticket.",
    });
  }
}
