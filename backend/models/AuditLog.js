import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: String,
      default: "",
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "staff", "nurse", "doctor", "system"],
      default: "system",
      index: true,
    },
    actorName: {
      type: String,
      default: "",
      trim: true,
    },
    actorEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: String,
      default: "",
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false },
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actorRole: 1, action: 1, timestamp: -1 });

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
