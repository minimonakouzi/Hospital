import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    role: { type: String, default: "staff", enum: ["staff"] },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    createdByAdminClerkId: { type: String, default: null },
  },
  { timestamps: true },
);

staffSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

staffSchema.index({ name: "text", department: "text", email: "text" });

const Staff = mongoose.models.Staff || mongoose.model("Staff", staffSchema);

export default Staff;
