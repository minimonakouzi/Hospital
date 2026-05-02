import PatientNotification from "../models/PatientNotification.js";
import PatientProfile from "../models/PatientProfile.js";

function cleanString(value) {
  return String(value ?? "").trim();
}

export async function createPatientNotification({
  patientId = null,
  clerkUserId = "",
  title = "",
  message = "",
  type = "System",
  link = "",
  createdByRole = "System",
  createdById = "",
  metadata = {},
  dedupeKey = "",
} = {}) {
  try {
    let resolvedClerkUserId = cleanString(clerkUserId);
    const resolvedPatientId = patientId || null;

    if (!resolvedClerkUserId && resolvedPatientId) {
      const patient = await PatientProfile.findById(resolvedPatientId)
        .select("clerkUserId")
        .lean();
      resolvedClerkUserId = cleanString(patient?.clerkUserId);
    }

    if (!resolvedClerkUserId) return null;

    const cleanedTitle = cleanString(title);
    const cleanedMessage = cleanString(message);
    if (!cleanedTitle || !cleanedMessage) return null;

    const cleanedDedupeKey = cleanString(dedupeKey || metadata?.dedupeKey);
    const finalMetadata =
      metadata && typeof metadata === "object" ? { ...metadata } : {};
    if (cleanedDedupeKey) {
      finalMetadata.dedupeKey = cleanedDedupeKey;
      const existing = await PatientNotification.findOne({
        clerkUserId: resolvedClerkUserId,
        title: cleanedTitle,
        "metadata.dedupeKey": cleanedDedupeKey,
      })
        .select("_id")
        .lean();
      if (existing) return existing;
    }

    return await PatientNotification.create({
      patientId: resolvedPatientId,
      clerkUserId: resolvedClerkUserId,
      title: cleanedTitle,
      message: cleanedMessage,
      type,
      link: cleanString(link),
      createdByRole,
      createdById: cleanString(createdById),
      metadata: finalMetadata,
    });
  } catch (err) {
    console.warn("createPatientNotification failed:", err?.message || err);
    return null;
  }
}

export default createPatientNotification;
