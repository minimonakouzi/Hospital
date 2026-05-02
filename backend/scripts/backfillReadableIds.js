import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Nurse from "../models/Nurse.js";
import PatientProfile from "../models/PatientProfile.js";
import { generateReadableId } from "../utils/readableIds.js";

async function backfillModel({ Model, field, prefix, counterKey, label }) {
  const records = await Model.find({
    $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: "" }],
  }).sort({ createdAt: 1, _id: 1 });

  let updated = 0;

  for (const record of records) {
    record[field] = await generateReadableId({ Model, field, prefix, counterKey });
    await record.save();
    updated += 1;
    console.log(`${label} ${record._id} -> ${record[field]}`);
  }

  console.log(`${label}: ${updated} record${updated === 1 ? "" : "s"} updated.`);
  return updated;
}

async function main() {
  await connectDB();

  const patientCount = await backfillModel({
    Model: PatientProfile,
    field: "patientCode",
    prefix: "PAT",
    counterKey: "patientProfile",
    label: "PatientProfile",
  });

  const nurseCount = await backfillModel({
    Model: Nurse,
    field: "nurseCode",
    prefix: "NUR",
    counterKey: "nurse",
    label: "Nurse",
  });

  console.log(`Backfill complete. Patients: ${patientCount}, nurses: ${nurseCount}.`);
}

main()
  .catch((err) => {
    console.error("Readable ID backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
