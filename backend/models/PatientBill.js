import mongoose from "mongoose";
import { generateReadableId } from "../utils/readableIds.js";

const billItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const patientBillSchema = new mongoose.Schema(
  {
    billCode: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      match: /^BILL-\d{4,}$/,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    serviceAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceAppointment",
      default: null,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
      default: null,
    },
    billType: {
      type: String,
      enum: [
        "Appointment",
        "Service",
        "Admission",
        "Lab",
        "Radiology",
        "Prescription",
        "Other",
      ],
      required: true,
      index: true,
    },
    description: { type: String, default: "", trim: true },
    items: { type: [billItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Partially Paid", "Refunded"],
      default: "Unpaid",
      index: true,
    },
    paymentMethod: { type: String, default: "", trim: true },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    insuranceProvider: { type: String, default: "", trim: true },
    insurancePolicyNumber: { type: String, default: "", trim: true },
    insuranceStatus: {
      type: String,
      enum: ["Not Provided", "Submitted", "Approved", "Rejected", "Pending"],
      default: "Not Provided",
      index: true,
    },
    insuranceCoverageAmount: { type: Number, default: 0 },
    patientPayableAmount: { type: Number, default: 0 },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    createdByRole: {
      type: String,
      enum: ["Staff", "Admin", "System"],
      default: "Staff",
    },
    createdById: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

patientBillSchema.pre("validate", async function assignBillCode() {
  if (this.billCode) return;
  this.billCode = await generateReadableId({
    Model: this.constructor,
    field: "billCode",
    prefix: "BILL",
    counterKey: "patientBill",
  });
});

patientBillSchema.index({ patientId: 1, invoiceDate: -1 });
patientBillSchema.index({ paymentStatus: 1, invoiceDate: -1 });
patientBillSchema.index({ insuranceStatus: 1, invoiceDate: -1 });
patientBillSchema.index({ createdAt: -1 });
patientBillSchema.index({
  billCode: "text",
  description: "text",
  "items.title": "text",
  insuranceProvider: "text",
  insurancePolicyNumber: "text",
});

const PatientBill =
  mongoose.models.PatientBill || mongoose.model("PatientBill", patientBillSchema);

export default PatientBill;
