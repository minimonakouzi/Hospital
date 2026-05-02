import mongoose from "mongoose";

const staffPerformanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    staffName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["Doctor", "Nurse", "Staff"],
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    shift: {
      type: String,
      required: true,
      enum: ["Morning", "Evening", "Night"],
      index: true,
    },
    attendance: {
      type: String,
      required: true,
      enum: ["Present", "Absent"],
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    utilization: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    performanceStatus: {
      type: String,
      required: true,
      enum: ["Excellent", "Good", "Needs Review"],
      default: "Good",
    },
  },
  { timestamps: true },
);

staffPerformanceSchema.index({
  staffName: "text",
  staffId: "text",
  department: "text",
  role: "text",
});

const StaffPerformance =
  mongoose.models.StaffPerformance ||
  mongoose.model("StaffPerformance", staffPerformanceSchema);

export default StaffPerformance;
