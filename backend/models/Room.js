import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ward",
      required: true,
      index: true,
    },
    roomNumber: { type: String, required: true, trim: true },
    roomType: {
      type: String,
      enum: ["Private", "Shared", "ICU", "Emergency"],
      required: true,
    },
    floorNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Available", "Full", "Maintenance"],
      default: "Available",
    },
  },
  { timestamps: true }
);

roomSchema.index({ wardId: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default Room;
