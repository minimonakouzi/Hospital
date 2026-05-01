import PatientProfile from "../models/PatientProfile.js";
import { getAuth } from "@clerk/express";

function resolveClerkUserId(req) {
  try {
    const auth = req.auth || {};
    const fromReq =
      auth?.userId ||
      auth?.user_id ||
      auth?.user?.id ||
      req.user?.id ||
      null;

    if (fromReq) return fromReq;

    try {
      const serverAuth = getAuth ? getAuth(req) : null;
      return serverAuth?.userId || null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function normalizeBody(body = {}) {
  return {
    phone: String(body.phone || "").trim(),
    age:
      body.age === "" || body.age === null || body.age === undefined
        ? null
        : Number(body.age),
    gender: ["Male", "Female"].includes(body.gender) ? body.gender : "",
    address: String(body.address || "").trim(),
    emergencyContact: String(body.emergencyContact || "").trim(),
    allergies: String(body.allergies || "").trim(),
    medicalHistory: String(body.medicalHistory || "").trim(),
    notificationsEnabled:
      typeof body.notificationsEnabled === "boolean"
        ? body.notificationsEnabled
        : true,
    imageUrl: String(body.imageUrl || "").trim(),
  };
}

export const getMyPatientProfile = async (req, res) => {
  try {
    const clerkUserId = resolveClerkUserId(req);

    if (!clerkUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let profile = await PatientProfile.findOne({ clerkUserId }).lean();

    if (!profile) {
      profile = await PatientProfile.create({
        clerkUserId,
        phone: "",
        age: null,
        gender: "",
        address: "",
        emergencyContact: "",
        allergies: "",
        medicalHistory: "",
        notificationsEnabled: true,
        imageUrl: "",
      });

      profile = profile.toObject();
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (err) {
    console.error("getMyPatientProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching patient profile",
    });
  }
};

export const upsertMyPatientProfile = async (req, res) => {
  try {
    const clerkUserId = resolveClerkUserId(req);

    if (!clerkUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const updates = normalizeBody(req.body || {});

    if (updates.age !== null && (!Number.isFinite(updates.age) || updates.age < 0 || updates.age > 120)) {
      return res.status(400).json({
        success: false,
        message: "Age must be a valid number between 0 and 120",
      });
    }

    const profile = await PatientProfile.findOneAndUpdate(
      { clerkUserId },
      { $set: updates },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Patient profile saved successfully",
      profile,
    });
  } catch (err) {
    console.error("upsertMyPatientProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while saving patient profile",
    });
  }
};