import mongoose from "mongoose";
import { generateReadableId } from "../utils/readableIds.js";

const messageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["Patient", "Staff", "Admin"],
      required: true,
    },
    senderId: {
      type: String,
      default: "",
      trim: true,
    },
    senderName: {
      type: String,
      default: "",
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: "", trim: true },
    fileUrl: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      match: /^TKT-\d{4,}$/,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
      index: true,
    },
    clerkUserId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Booking Problem",
        "Cancellation Help",
        "Payment Issue",
        "Medical Report",
        "General Question",
        "Other",
      ],
      default: "General Question",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
      index: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
      index: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

supportTicketSchema.pre("validate", async function assignTicketCode() {
  if (this.ticketCode) return;
  this.ticketCode = await generateReadableId({
    Model: this.constructor,
    field: "ticketCode",
    prefix: "TKT",
    counterKey: "supportTicket",
  });
});

supportTicketSchema.index({ clerkUserId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ subject: "text", ticketCode: "text" });

const SupportTicket =
  mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
