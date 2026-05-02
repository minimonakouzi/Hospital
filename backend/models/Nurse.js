import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { generateReadableId } from "../utils/readableIds.js";

const SALT_ROUNDS = 10;

const nurseSchema = new mongoose.Schema(
  {
    nurseCode: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      match: /^NUR-\d{4,}$/,
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    phone: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    shift: {
      type: String,
      enum: ["Morning", "Evening", "Night", "Rotating"],
      required: true,
      default: "Morning",
    },
    experience: { type: String, default: "", trim: true },
    specialization: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Active", "On Leave", "Inactive"],
      default: "Active",
    },
    notes: { type: String, default: "", trim: true },
    clerkUserId: { type: String, default: null },
    createdByAdminClerkId: { type: String, default: null },
  },
  { timestamps: true }
);

nurseSchema.pre("validate", async function assignNurseCode() {
  if (this.nurseCode) return;
  this.nurseCode = await generateReadableId({
    Model: this.constructor,
    field: "nurseCode",
    prefix: "NUR",
    counterKey: "nurse",
  });
});

nurseSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

nurseSchema.index({ name: "text", department: "text", email: "text", nurseCode: "text" });

const Nurse = mongoose.models.Nurse || mongoose.model("Nurse", nurseSchema);

export default Nurse;
