import AuditLog from "../models/AuditLog.js";

function clerkEmail(user = {}) {
  return (
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ""
  );
}

function clerkName(user = {}) {
  return (
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    ""
  );
}

export function getAuditActor(req = {}) {
  if (req.admin?.userId || req.admin?.user) {
    return {
      actorId: req.admin?.userId || "",
      actorRole: "admin",
      actorName: clerkName(req.admin?.user),
      actorEmail: clerkEmail(req.admin?.user),
    };
  }

  if (req.staff) {
    return {
      actorId: String(req.staff._id || req.staff.id || ""),
      actorRole: "staff",
      actorName: req.staff.name || "",
      actorEmail: req.staff.email || "",
    };
  }

  if (req.nurse) {
    return {
      actorId: String(req.nurse._id || req.nurse.id || ""),
      actorRole: "nurse",
      actorName: req.nurse.name || "",
      actorEmail: req.nurse.email || "",
    };
  }

  if (req.doctor) {
    return {
      actorId: String(req.doctor._id || req.doctor.id || ""),
      actorRole: "doctor",
      actorName: req.doctor.name || "",
      actorEmail: req.doctor.email || "",
    };
  }

  return {
    actorId: "",
    actorRole: "system",
    actorName: "",
    actorEmail: "",
  };
}

export async function createAuditLog(req, entry = {}) {
  try {
    const actor = getAuditActor(req);
    await AuditLog.create({
      ...actor,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ? String(entry.entityId) : "",
      details: entry.details || {},
      timestamp: new Date(),
    });
  } catch (err) {
    console.warn("Audit log write failed:", err?.message || err);
  }
}
