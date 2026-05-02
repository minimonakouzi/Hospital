import mongoose from "mongoose";
import { generateReadableId } from "../utils/readableIds.js";

const radiologyReportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      match: /^RAD-\d{4,}$/,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
      default: null,
    },
    serviceAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceAppointment",
      default: null,
    },
    uploadedByType: {
      type: String,
      enum: ["Doctor", "Staff", "Admin"],
      required: true,
      index: true,
    },
    uploadedById: {
      type: String,
      default: "",
      trim: true,
    },
    reportType: {
      type: String,
      enum: ["X-Ray", "MRI", "CT Scan", "Ultrasound", "Other"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, default: "", trim: true },
    findings: { type: String, default: "", trim: true },
    impression: { type: String, default: "", trim: true },
    reportDate: { type: Date, default: Date.now },
    fileUrl: { type: String, default: "", trim: true },
    fileName: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Reviewed"],
      default: "Completed",
      index: true,
    },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

radiologyReportSchema.pre("validate", async function assignReportCode() {
  if (this.reportCode) return;
  this.reportCode = await generateReadableId({
    Model: this.constructor,
    field: "reportCode",
    prefix: "RAD",
    counterKey: "radiologyReport",
  });
});

radiologyReportSchema.index({ patientId: 1, reportDate: -1 });
radiologyReportSchema.index({ doctorId: 1, reportDate: -1 });
radiologyReportSchema.index({ createdAt: -1 });
radiologyReportSchema.index({ reportCode: "text", title: "text", description: "text" });

const RadiologyReport =
  mongoose.models.RadiologyReport ||
  mongoose.model("RadiologyReport", radiologyReportSchema);

export default RadiologyReport;
