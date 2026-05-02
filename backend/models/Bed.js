import mongoose from "mongoose";

const bedSchema = new mongoose.Schema(
  {
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ward",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    bedNumber: { type: String, required: true, trim: true },
    bedStatus: {
      type: String,
      enum: ["Available", "Occupied", "Cleaning", "Maintenance"],
      default: "Available",
    },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });

const Bed = mongoose.models.Bed || mongoose.model("Bed", bedSchema);

export default Bed;
