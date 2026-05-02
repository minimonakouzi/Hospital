import Counter from "../models/Counter.js";

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatReadableId(prefix, seq) {
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

export async function getHighestReadableIdSeq(Model, field, prefix) {
  const pattern = new RegExp(`^${escapeRegex(prefix)}-(\\d+)$`);
  const records = await Model.find({ [field]: pattern }).select(field).lean();

  return records.reduce((highest, record) => {
    const match = String(record?.[field] || "").match(pattern);
    const seq = match ? Number(match[1]) : 0;
    return Number.isFinite(seq) && seq > highest ? seq : highest;
  }, 0);
}

export async function generateReadableId({ Model, field, prefix, counterKey }) {
  const highestExistingSeq = await getHighestReadableIdSeq(Model, field, prefix);

  await Counter.findOneAndUpdate(
    { _id: counterKey },
    { $setOnInsert: { seq: highestExistingSeq } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { _id: counterKey },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    const code = formatReadableId(prefix, counter.seq);
    const exists = await Model.exists({ [field]: code });
    if (!exists) return code;
  }

  throw new Error(`Unable to generate a unique ${field}.`);
}

export function isReadableId(value, prefix) {
  return new RegExp(`^${escapeRegex(prefix)}-\\d{4,}$`).test(String(value || ""));
}
