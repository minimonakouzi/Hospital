import mongoose from "mongoose";

const wardSchema = new mongoose.Schema(
  {
    wardName: { type: String, required: true, trim: true },
    wardType: {
      type: String,
      enum: ["General", "ICU", "Emergency", "Surgery", "Maternity", "Pediatric"],
      required: true,
    },
    floorNumber: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Active", "Under Maintenance", "Closed"],
      default: "Active",
    },
  },
  { timestamps: true }
);

const Ward = mongoose.models.Ward || mongoose.model("Ward", wardSchema);

export default Ward;
