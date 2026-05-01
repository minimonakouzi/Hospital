import mongoose from "mongoose";

const patientProfileSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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

const PatientProfile =
  mongoose.models.PatientProfile ||
  mongoose.model("PatientProfile", patientProfileSchema);

export default PatientProfile;