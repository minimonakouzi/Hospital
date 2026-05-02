import mongoose from "mongoose";

const staffAttendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "staffModel",
    },
    staffModel: {
      type: String,
      required: true,
      enum: ["Doctor", "Nurse", "Staff"],
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["Doctor", "Nurse", "Staff"],
    },
    department: {
      type: String,
      default: "Unassigned",
    },
    shiftType: {
      type: String,
      default: "Unassigned",
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "On Leave"],
      default: "Absent",
    },
    date: {
      type: Date,
      required: true,
    },
    checkInTime: {
      type: String,
      default: "",
    },
    checkOutTime: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

staffAttendanceSchema.index({ date: 1, status: 1 });
staffAttendanceSchema.index({ staffId: 1, staffModel: 1, date: 1 });
staffAttendanceSchema.index({ department: 1, shiftType: 1 });

const StaffAttendance =
  mongoose.models.StaffAttendance ||
  mongoose.model("StaffAttendance", staffAttendanceSchema);

export default StaffAttendance;
