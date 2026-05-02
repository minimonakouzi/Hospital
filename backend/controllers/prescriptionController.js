import mongoose from "mongoose";
import { getAuth } from "@clerk/express";
import Appointment from "../models/Appointment.js";
import PatientProfile from "../models/PatientProfile.js";
import Prescription from "../models/Prescription.js";
import { createPatientNotification } from "../utils/createPatientNotification.js";

function cleanString(value) {
  return String(value ?? "").trim();
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message) {
  return res.status(404).json({ success: false, message });
}

function resolveClerkUserId(req) {
  return req.auth?.userId || getAuth(req)?.userId || req.userId || "";
}

function doctorIdFromReq(req) {
  return req.doctor?._id || req.doctor?.id || "";
}

function populatePrescription(query) {
  return query
    .populate("patientId", "patientCode name email phone age gender clerkUserId")
    .populate("doctorId", "name email specialization imageUrl")
    .populate("appointmentId", "patientName mobile age gender date time status");
}

function notifyPrescriptionAdded(prescription, patient, doctorId) {
  void createPatientNotification({
    patientId: prescription.patientId,
    clerkUserId: patient?.clerkUserId,
    title: "New prescription added",
    message: "A new prescription is available in your account.",
    type: "Prescription",
    link: "/my-prescriptions",
    createdByRole: "Doctor",
    createdById: cleanString(doctorId),
    dedupeKey: `prescription:${prescription._id}:created`,
    metadata: {
      prescriptionId: String(prescription._id),
      appointmentId: prescription.appointmentId ? String(prescription.appointmentId) : "",
    },
  });
}

function normalizeMedicines(raw = []) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      medicineName: cleanString(item?.medicineName),
      dosage: cleanString(item?.dosage),
      frequency: cleanString(item?.frequency),
      duration: cleanString(item?.duration),
      instructions: cleanString(item?.instructions),
    }))
    .filter((item) =>
      item.medicineName || item.dosage || item.frequency || item.duration || item.instructions
    );
}

function validateMedicines(medicines = []) {
  if (!medicines.length) return "At least one medicine is required.";
  const invalidIndex = medicines.findIndex(
    (item) => !item.medicineName || !item.dosage || !item.frequency || !item.duration
  );
  if (invalidIndex >= 0) {
    return `Medicine ${invalidIndex + 1} must include name, dosage, frequency, and duration.`;
  }
  return "";
}

async function getCurrentPatientProfile(req, res) {
  const clerkUserId = resolveClerkUserId(req);
  if (!clerkUserId) {
    res.status(401).json({ success: false, message: "Patient authentication required." });
    return null;
  }

  const patient = await PatientProfile.findOne({ clerkUserId }).lean();
  if (!patient) {
    res.status(404).json({ success: false, message: "Patient profile not found." });
    return null;
  }

  return patient;
}

export async function lookupPrescriptionPatients(req, res) {
  try {
    const search = cleanString(req.query?.search);
    const re = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
    const match = re
      ? {
          $or: [
            { patientCode: re },
            { name: re },
            { email: re },
            { phone: re },
          ],
        }
      : {};

    const patients = await PatientProfile.find(match)
      .select("_id patientCode name email phone age gender")
      .sort({ patientCode: 1, createdAt: -1 })
      .limit(80)
      .lean();

    return res.json({ success: true, data: patients });
  } catch (err) {
    console.error("lookupPrescriptionPatients error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading patients.",
    });
  }
}

export async function createPrescription(req, res) {
  try {
    const doctorId = doctorIdFromReq(req);
    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Doctor authentication required." });
    }

    const patientId = cleanString(req.body?.patientId);
    const appointmentId = cleanString(req.body?.appointmentId);
    const medicines = normalizeMedicines(req.body?.medicines);

    if (!patientId) return badRequest(res, "patientId is required.");
    if (!isValidObjectId(patientId)) return badRequest(res, "Invalid patientId.");
    if (appointmentId && !isValidObjectId(appointmentId)) return badRequest(res, "Invalid appointmentId.");

    const medicineError = validateMedicines(medicines);
    if (medicineError) return badRequest(res, medicineError);

    const patient = await PatientProfile.findById(patientId).lean();
    if (!patient) return notFound(res, "Patient profile not found.");

    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findById(appointmentId).lean();
      if (!appointment) return notFound(res, "Appointment not found.");
    }

    const prescription = await Prescription.create({
      patientId,
      doctorId,
      appointmentId: appointment ? appointment._id : null,
      diagnosis: cleanString(req.body?.diagnosis),
      medicines,
      notes: cleanString(req.body?.notes),
      status: "Active",
    });
    notifyPrescriptionAdded(prescription, patient, doctorId);

    const populated = await populatePrescription(Prescription.findById(prescription._id)).lean();
    return res.status(201).json({
      success: true,
      message: "Prescription created successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("createPrescription error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating prescription.",
    });
  }
}

export async function getDoctorPrescriptions(req, res) {
  try {
    const doctorId = doctorIdFromReq(req);
    const prescriptions = await populatePrescription(
      Prescription.find({ doctorId }).sort({ createdAt: -1 })
    ).lean();
    return res.json({ success: true, data: prescriptions });
  } catch (err) {
    console.error("getDoctorPrescriptions error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading prescriptions." });
  }
}

export async function getDoctorPrescriptionById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid prescription id.");

    const prescription = await populatePrescription(
      Prescription.findOne({ _id: id, doctorId: doctorIdFromReq(req) })
    ).lean();
    if (!prescription) return notFound(res, "Prescription not found.");

    return res.json({ success: true, data: prescription });
  } catch (err) {
    console.error("getDoctorPrescriptionById error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading prescription." });
  }
}

export async function updatePrescription(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid prescription id.");

    const prescription = await Prescription.findOne({ _id: id, doctorId: doctorIdFromReq(req) });
    if (!prescription) return notFound(res, "Prescription not found.");
    if (prescription.status === "Cancelled") {
      return badRequest(res, "Cancelled prescriptions cannot be updated.");
    }

    const patientId = cleanString(req.body?.patientId);
    const appointmentId = cleanString(req.body?.appointmentId);

    if (patientId) {
      if (!isValidObjectId(patientId)) return badRequest(res, "Invalid patientId.");
      const patient = await PatientProfile.findById(patientId).lean();
      if (!patient) return notFound(res, "Patient profile not found.");
      prescription.patientId = patientId;
    }

    if (req.body?.appointmentId !== undefined) {
      if (!appointmentId) {
        prescription.appointmentId = null;
      } else {
        if (!isValidObjectId(appointmentId)) return badRequest(res, "Invalid appointmentId.");
        const appointment = await Appointment.findById(appointmentId).lean();
        if (!appointment) return notFound(res, "Appointment not found.");
        prescription.appointmentId = appointmentId;
      }
    }

    if (req.body?.medicines !== undefined) {
      const medicines = normalizeMedicines(req.body?.medicines);
      const medicineError = validateMedicines(medicines);
      if (medicineError) return badRequest(res, medicineError);
      prescription.medicines = medicines;
    }

    if (req.body?.diagnosis !== undefined) prescription.diagnosis = cleanString(req.body.diagnosis);
    if (req.body?.notes !== undefined) prescription.notes = cleanString(req.body.notes);
    if (["Active", "Completed"].includes(req.body?.status)) prescription.status = req.body.status;

    await prescription.save();
    const populated = await populatePrescription(Prescription.findById(prescription._id)).lean();

    return res.json({
      success: true,
      message: "Prescription updated successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("updatePrescription error:", err);
    return res.status(500).json({ success: false, message: "Server error while updating prescription." });
  }
}

export async function cancelPrescription(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid prescription id.");

    const prescription = await Prescription.findOne({ _id: id, doctorId: doctorIdFromReq(req) });
    if (!prescription) return notFound(res, "Prescription not found.");

    prescription.status = "Cancelled";
    await prescription.save();

    const populated = await populatePrescription(Prescription.findById(prescription._id)).lean();
    return res.json({
      success: true,
      message: "Prescription cancelled successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("cancelPrescription error:", err);
    return res.status(500).json({ success: false, message: "Server error while cancelling prescription." });
  }
}

export async function getMyPrescriptions(req, res) {
  try {
    const patient = await getCurrentPatientProfile(req, res);
    if (!patient) return null;

    const prescriptions = await populatePrescription(
      Prescription.find({ patientId: patient._id }).sort({ createdAt: -1 })
    ).lean();

    return res.json({ success: true, data: prescriptions });
  } catch (err) {
    console.error("getMyPrescriptions error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading prescriptions." });
  }
}

export async function getMyPrescriptionById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid prescription id.");

    const patient = await getCurrentPatientProfile(req, res);
    if (!patient) return null;

    const prescription = await populatePrescription(
      Prescription.findOne({ _id: id, patientId: patient._id })
    ).lean();
    if (!prescription) return notFound(res, "Prescription not found.");

    return res.json({ success: true, data: prescription });
  } catch (err) {
    console.error("getMyPrescriptionById error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading prescription." });
  }
}
