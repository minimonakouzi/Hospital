import mongoose from "mongoose";

const nursingNoteSchema = new mongoose.Schema(
  {
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
    },
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nurse",
      required: true,
    },
    noteTitle: { type: String, required: true, trim: true },
    noteDescription: { type: String, required: true, trim: true },
    patientCondition: {
      type: String,
      enum: ["Stable", "Critical", "Improving", "Needs Attention"],
      default: "Stable",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nurse",
      required: true,
    },
  },
  { timestamps: true }
);

nursingNoteSchema.index({ admissionId: 1 });

const NursingNote =
  mongoose.models.NursingNote ||
  mongoose.model("NursingNote", nursingNoteSchema);

export default NursingNote;
