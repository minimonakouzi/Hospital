import mongoose from "mongoose";
import { generateReadableId } from "../utils/readableIds.js";

const patientProfileSchema = new mongoose.Schema(
  {
    patientCode: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      match: /^PAT-\d{4,}$/,
    },

    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    age: {
      type: Number,
      default: null,
      min: 0,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", ""],
      default: "",
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    emergencyContact: {
      type: String,
      default: "",
      trim: true,
    },

    allergies: {
      type: String,
      default: "",
      trim: true,
    },

    medicalHistory: {
      type: String,
      default: "",
      trim: true,
    },

    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

patientProfileSchema.pre("validate", async function assignPatientCode() {
  if (this.patientCode) return;
  this.patientCode = await generateReadableId({
    Model: this.constructor,
    field: "patientCode",
    prefix: "PAT",
    counterKey: "patientProfile",
  });
});

patientProfileSchema.index({ name: "text", email: "text", phone: "text", patientCode: "text" });

const PatientProfile =
  mongoose.models.PatientProfile ||
  mongoose.model("PatientProfile", patientProfileSchema);

export default PatientProfile;
