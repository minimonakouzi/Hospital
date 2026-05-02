import mongoose from "mongoose";

const transferHistorySchema = new mongoose.Schema(
  {
    fromWardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ward",
      default: null,
    },
    fromRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    fromBedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bed",
      default: null,
    },
    toWardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ward",
      default: null,
    },
    toRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    toBedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bed",
      default: null,
    },
    transferReason: { type: String, default: "", trim: true },
    transferDate: { type: Date, default: Date.now },
    transferredBy: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const admissionSchema = new mongoose.Schema(
  {
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
    },
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nurse",
      default: null,
    },
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ward",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
      index: true,
    },
    admissionDate: { type: Date, required: true, default: Date.now },
    expectedDischargeDate: { type: Date, default: null },
    dischargeDate: { type: Date, default: null },
    reasonForAdmission: { type: String, required: true, trim: true },
    dischargeSummary: { type: String, default: "", trim: true },
    finalStatus: {
      type: String,
      enum: ["Recovered", "Referred", "Left Against Advice", "Deceased", "Other", ""],
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Transferred", "Discharged"],
      default: "Active",
      index: true,
    },
    notes: { type: String, default: "", trim: true },
    transferHistory: { type: [transferHistorySchema], default: [] },
    createdBy: { type: String, default: "", trim: true },
    updatedBy: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

admissionSchema.index({ patientId: 1, status: 1 });
admissionSchema.index({ bedId: 1, status: 1 });

const Admission =
  mongoose.models.Admission || mongoose.model("Admission", admissionSchema);

export default Admission;
