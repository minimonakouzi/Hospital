import mongoose from "mongoose";
import { generateReadableId } from "../utils/readableIds.js";

const resultSchema = new mongoose.Schema(
  {
    testName: { type: String, default: "", trim: true },
    value: { type: String, default: "", trim: true },
    unit: { type: String, default: "", trim: true },
    referenceRange: { type: String, default: "", trim: true },
    flag: {
      type: String,
      enum: ["Normal", "High", "Low", "Critical", ""],
      default: "",
    },
  },
  { _id: false }
);

const labReportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      match: /^LAB-\d{4,}$/,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
      index: true,
    },
    requestedByDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
      index: true,
    },
    uploadedByStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
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
    testType: {
      type: String,
      enum: ["Blood Test", "Urine Test", "Diabetes Test", "Cholesterol Test", "Infection Test", "Other"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    specimen: { type: String, default: "", trim: true },
    requestedDate: { type: Date, default: Date.now },
    resultDate: { type: Date, default: null },
    results: { type: [resultSchema], default: [] },
    resultSummary: { type: String, default: "", trim: true },
    interpretation: { type: String, default: "", trim: true },
    fileUrl: { type: String, default: "", trim: true },
    fileName: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Requested", "In Progress", "Completed", "Reviewed"],
      default: "Requested",
      index: true,
    },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

labReportSchema.pre("validate", async function assignReportCode() {
  if (this.reportCode) return;
  this.reportCode = await generateReadableId({
    Model: this.constructor,
    field: "reportCode",
    prefix: "LAB",
    counterKey: "labReport",
  });
});

labReportSchema.index({ patientId: 1, requestedDate: -1 });
labReportSchema.index({ requestedByDoctorId: 1, requestedDate: -1 });
labReportSchema.index({ createdAt: -1 });
labReportSchema.index({ reportCode: "text", title: "text", description: "text", resultSummary: "text" });

const LabReport =
  mongoose.models.LabReport || mongoose.model("LabReport", labReportSchema);

export default LabReport;
