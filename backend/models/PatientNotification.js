import mongoose from "mongoose";

const patientNotificationSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      default: null,
      index: true,
    },
    clerkUserId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Appointment", "Prescription", "Report", "Ticket", "Billing", "System"],
      default: "System",
      index: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdByRole: {
      type: String,
      enum: ["System", "Admin", "Staff", "Doctor", "Nurse"],
      default: "System",
    },
    createdById: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

patientNotificationSchema.index({ clerkUserId: 1, readAt: 1 });
patientNotificationSchema.index({ patientId: 1, readAt: 1 });
patientNotificationSchema.index({ createdAt: -1 });

const PatientNotification =
  mongoose.models.PatientNotification ||
  mongoose.model("PatientNotification", patientNotificationSchema);

export default PatientNotification;
