import mongoose from "mongoose";
import { getAuth } from "@clerk/express";
import Admission from "../models/Admission.js";
import Bed from "../models/Bed.js";
import Doctor from "../models/Doctor.js";
import Nurse from "../models/Nurse.js";
import NursingNote from "../models/NursingNote.js";
import PatientProfile from "../models/PatientProfile.js";
import Room from "../models/Room.js";
import Ward from "../models/Ward.js";

const ACTIVE_ADMISSION_STATUSES = ["Active", "Transferred"];
const FINAL_STATUSES = ["Recovered", "Referred", "Left Against Advice", "Deceased", "Other"];
const BED_RELEASE_STATUSES = ["Cleaning", "Available"];
const PATIENT_CONDITIONS = ["Stable", "Critical", "Improving", "Needs Attention"];
const SAFE_NURSE_BED_TRANSITIONS = {
  Cleaning: ["Available"],
  Available: ["Maintenance"],
  Maintenance: ["Available"],
};

function cleanString(value) {
  return String(value ?? "").trim();
}

function resolveClerkUserId(req) {
  return req.auth?.userId || getAuth(req)?.userId || req.userId || req.clerkUserId || "";
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message) {
  return res.status(404).json({ success: false, message });
}

function actorId(req) {
  return String(req.staff?._id || req.staff?.id || req.admin?.userId || "");
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function populateAdmission(query) {
  return query
    .populate("patientId")
    .populate("doctorId", "name email specialization imageUrl")
    .populate("nurseId", "nurseCode name email department shift status phone")
    .populate("wardId")
    .populate("roomId")
    .populate("bedId")
    .populate("transferHistory.fromWardId")
    .populate("transferHistory.fromRoomId")
    .populate("transferHistory.fromBedId")
    .populate("transferHistory.toWardId")
    .populate("transferHistory.toRoomId")
    .populate("transferHistory.toBedId");
}

function populateNote(query) {
  return query
    .populate("nurseId", "nurseCode name email department shift")
    .populate("createdBy", "nurseCode name email department shift");
}

async function ensureObjectIds(ids = {}) {
  const invalid = Object.entries(ids).find(([, value]) => value && !isValidObjectId(value));
  if (!invalid) return "";
  const [key] = invalid;
  return `Invalid ${key}.`;
}

async function getAvailableBed({ wardId, roomId, bedId }) {
  const bed = await Bed.findById(bedId);
  if (!bed) {
    return { error: "Bed not found." };
  }

  if (String(bed.wardId) !== String(wardId) || String(bed.roomId) !== String(roomId)) {
    return { error: "Selected bed does not belong to the selected ward and room." };
  }

  if (bed.bedStatus !== "Available") {
    return { error: "This bed is not available for admission." };
  }

  return { bed };
}

async function searchAdmissionIds(search) {
  const q = cleanString(search);
  if (!q) return null;

  const re = new RegExp(q, "i");
  const [patients, doctors, nurses, wards, rooms, beds] = await Promise.all([
    PatientProfile.find({
      $or: [
        { patientCode: re },
        { name: re },
        { email: re },
        { clerkUserId: re },
        { phone: re },
        { emergencyContact: re },
        { address: re },
        { medicalHistory: re },
      ],
    })
      .select("_id")
      .lean(),
    Doctor.find({ $or: [{ name: re }, { email: re }, { specialization: re }] })
      .select("_id")
      .lean(),
    Nurse.find({ $or: [{ nurseCode: re }, { name: re }, { email: re }, { phone: re }, { department: re }] })
      .select("_id")
      .lean(),
    Ward.find({ $or: [{ wardName: re }, { wardType: re }, { floorNumber: re }] })
      .select("_id")
      .lean(),
    Room.find({ $or: [{ roomNumber: re }, { roomType: re }, { floorNumber: re }] })
      .select("_id")
      .lean(),
    Bed.find({ $or: [{ bedNumber: re }, { bedStatus: re }, { notes: re }] })
      .select("_id")
      .lean(),
  ]);

  return {
    $or: [
      { reasonForAdmission: re },
      { notes: re },
      { dischargeSummary: re },
      { finalStatus: re },
      { status: re },
      { patientId: { $in: patients.map((item) => item._id) } },
      { doctorId: { $in: doctors.map((item) => item._id) } },
      { nurseId: { $in: nurses.map((item) => item._id) } },
      { wardId: { $in: wards.map((item) => item._id) } },
      { roomId: { $in: rooms.map((item) => item._id) } },
      { bedId: { $in: beds.map((item) => item._id) } },
    ],
  };
}

function regexSearch(value) {
  const q = cleanString(value);
  return q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
}

function patientLookupName(patient = {}) {
  return patient.name || patient.fullName || "";
}

export async function lookupPatients(req, res) {
  try {
    const re = regexSearch(req.query?.search);
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
      .select("_id patientCode name email phone gender age")
      .sort({ patientCode: 1, createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      data: patients.map((patient) => ({
        _id: patient._id,
        patientCode: patient.patientCode || "",
        name: patientLookupName(patient),
        email: patient.email || "",
        phone: patient.phone || "",
        gender: patient.gender || "",
        age: patient.age ?? "",
      })),
    });
  } catch (err) {
    console.error("lookupPatients error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading patient lookup data.",
    });
  }
}

export async function lookupNurses(req, res) {
  try {
    const re = regexSearch(req.query?.search);
    const department = cleanString(req.query?.department);
    const shift = cleanString(req.query?.shift);
    const status = cleanString(req.query?.status);
    const match = {};

    if (re) {
      match.$or = [
        { nurseCode: re },
        { name: re },
        { email: re },
        { phone: re },
        { department: re },
      ];
    }
    if (department) match.department = new RegExp(department.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (shift) match.shift = shift;
    if (status) match.status = status;

    const nurses = await Nurse.find(match)
      .select("_id nurseCode name email phone department shift status")
      .sort({ nurseCode: 1, name: 1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      data: nurses.map((nurse) => ({
        _id: nurse._id,
        nurseCode: nurse.nurseCode || "",
        name: nurse.name || "",
        email: nurse.email || "",
        phone: nurse.phone || "",
        department: nurse.department || "",
        shift: nurse.shift || "",
        status: nurse.status || "",
      })),
    });
  } catch (err) {
    console.error("lookupNurses error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading nurse lookup data.",
    });
  }
}

export async function getAdmissions(req, res) {
  try {
    const {
      search,
      status,
      wardId,
      roomId,
      bedId,
      doctorId,
      nurseId,
      patientId,
      dateFrom,
      dateTo,
    } = req.query;

    const invalid = await ensureObjectIds({ wardId, roomId, bedId, doctorId, nurseId, patientId });
    if (invalid) return badRequest(res, invalid);

    const match = {};
    if (status && cleanString(status) !== "All") match.status = cleanString(status);
    if (wardId) match.wardId = wardId;
    if (roomId) match.roomId = roomId;
    if (bedId) match.bedId = bedId;
    if (doctorId) match.doctorId = doctorId;
    if (nurseId) match.nurseId = nurseId;
    if (patientId) match.patientId = patientId;

    const from = parseDate(dateFrom);
    const to = parseDate(dateTo);
    if (dateFrom && !from) return badRequest(res, "Invalid dateFrom value.");
    if (dateTo && !to) return badRequest(res, "Invalid dateTo value.");
    if (from || to) {
      match.admissionDate = {};
      if (from) match.admissionDate.$gte = from;
      if (to) {
        to.setHours(23, 59, 59, 999);
        match.admissionDate.$lte = to;
      }
    }

    const searchMatch = await searchAdmissionIds(search);
    const finalMatch = searchMatch ? { $and: [match, searchMatch] } : match;

    const admissions = await populateAdmission(
      Admission.find(finalMatch).sort({ admissionDate: -1, createdAt: -1 })
    ).lean();

    return res.json({
      success: true,
      message: "Admissions loaded successfully.",
      data: admissions,
    });
  } catch (err) {
    console.error("getAdmissions error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading admissions.",
    });
  }
}

export async function getAdmissionStats(req, res) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      activeAdmissions,
      dischargedThisMonth,
      totalAdmissions,
      totalBeds,
      availableBeds,
      occupiedBeds,
      cleaningBeds,
      maintenanceBeds,
    ] = await Promise.all([
      Admission.countDocuments({ status: { $in: ACTIVE_ADMISSION_STATUSES } }),
      Admission.countDocuments({
        status: "Discharged",
        dischargeDate: { $gte: monthStart, $lte: monthEnd },
      }),
      Admission.countDocuments(),
      Bed.countDocuments(),
      Bed.countDocuments({ bedStatus: "Available" }),
      Bed.countDocuments({ bedStatus: "Occupied" }),
      Bed.countDocuments({ bedStatus: "Cleaning" }),
      Bed.countDocuments({ bedStatus: "Maintenance" }),
    ]);

    const occupancyPercentage =
      totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(2)) : 0;

    return res.json({
      success: true,
      stats: {
        activeAdmissions,
        dischargedThisMonth,
        totalAdmissions,
        availableBeds,
        occupiedBeds,
        cleaningBeds,
        maintenanceBeds,
        occupancyPercentage: Number.isFinite(occupancyPercentage) ? occupancyPercentage : 0,
      },
    });
  } catch (err) {
    console.error("getAdmissionStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading admission statistics.",
    });
  }
}

export async function getAdmissionById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid admission id.");

    const admission = await populateAdmission(Admission.findById(id)).lean();
    if (!admission) return notFound(res, "Admission not found.");

    return res.json({
      success: true,
      message: "Admission loaded successfully.",
      data: admission,
    });
  } catch (err) {
    console.error("getAdmissionById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading admission.",
    });
  }
}

export async function admitPatient(req, res) {
  try {
    const patientId = cleanString(req.body?.patientId);
    const doctorId = cleanString(req.body?.doctorId);
    const nurseId = cleanString(req.body?.nurseId);
    const wardId = cleanString(req.body?.wardId);
    const roomId = cleanString(req.body?.roomId);
    const bedId = cleanString(req.body?.bedId);
    const reasonForAdmission = cleanString(req.body?.reasonForAdmission);

    if (!patientId) return badRequest(res, "Patient is required.");
    if (!wardId || !roomId || !bedId) {
      return badRequest(res, "Ward, room, and bed are required.");
    }
    if (!reasonForAdmission) return badRequest(res, "Reason for admission is required.");

    const invalid = await ensureObjectIds({ patientId, doctorId, nurseId, wardId, roomId, bedId });
    if (invalid) return badRequest(res, invalid);

    const [patient, ward, room] = await Promise.all([
      PatientProfile.findById(patientId).lean(),
      Ward.findById(wardId).lean(),
      Room.findById(roomId).lean(),
    ]);

    if (!patient) return notFound(res, "Patient profile not found.");
    if (!ward) return notFound(res, "Ward not found.");
    if (!room) return notFound(res, "Room not found.");
    if (String(room.wardId) !== String(wardId)) {
      return badRequest(res, "Selected room does not belong to the selected ward.");
    }

    if (doctorId) {
      const doctor = await Doctor.findById(doctorId).lean();
      if (!doctor) return notFound(res, "Doctor not found.");
    }

    if (nurseId) {
      const nurse = await Nurse.findById(nurseId).lean();
      if (!nurse) return notFound(res, "Nurse not found.");
    }

    const activeAdmission = await Admission.exists({
      patientId,
      status: { $in: ACTIVE_ADMISSION_STATUSES },
    });
    if (activeAdmission) {
      return badRequest(res, "This patient already has an active admission.");
    }

    const { bed, error } = await getAvailableBed({ wardId, roomId, bedId });
    if (error) return badRequest(res, error);

    const admissionDate = parseDate(req.body?.admissionDate) || new Date();
    const expectedDischargeDate = parseDate(req.body?.expectedDischargeDate);
    if (req.body?.expectedDischargeDate && !expectedDischargeDate) {
      return badRequest(res, "Invalid expected discharge date.");
    }

    const previousBedStatus = bed.bedStatus;
    bed.bedStatus = "Occupied";
    await bed.save();

    let admission;
    try {
      admission = await Admission.create({
        patientId,
        doctorId: doctorId || null,
        nurseId: nurseId || null,
        wardId,
        roomId,
        bedId,
        admissionDate,
        expectedDischargeDate,
        reasonForAdmission,
        notes: cleanString(req.body?.notes),
        status: "Active",
        createdBy: actorId(req),
        updatedBy: actorId(req),
      });
    } catch (err) {
      bed.bedStatus = previousBedStatus;
      await bed.save().catch((rollbackErr) =>
        console.error("admitPatient bed rollback failed:", rollbackErr)
      );
      throw err;
    }

    const populated = await populateAdmission(Admission.findById(admission._id)).lean();

    return res.status(201).json({
      success: true,
      message: "Patient admitted successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("admitPatient error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while admitting patient.",
    });
  }
}

export async function transferAdmission(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid admission id.");

    const newWardId = cleanString(req.body?.newWardId);
    const newRoomId = cleanString(req.body?.newRoomId);
    const newBedId = cleanString(req.body?.newBedId);
    const oldBedAfterTransferStatus = cleanString(req.body?.oldBedAfterTransferStatus) || "Cleaning";
    const transferReason = cleanString(req.body?.transferReason);

    if (!newWardId || !newRoomId || !newBedId) {
      return badRequest(res, "New ward, room, and bed are required.");
    }
    if (!BED_RELEASE_STATUSES.includes(oldBedAfterTransferStatus)) {
      return badRequest(res, "Old bed status must be Cleaning or Available.");
    }

    const invalid = await ensureObjectIds({ newWardId, newRoomId, newBedId });
    if (invalid) return badRequest(res, invalid);

    const admission = await Admission.findById(id);
    if (!admission) return notFound(res, "Admission not found.");
    if (admission.status === "Discharged") {
      return badRequest(res, "A discharged admission cannot be transferred.");
    }

    const [newWard, newRoom, oldBed] = await Promise.all([
      Ward.findById(newWardId).lean(),
      Room.findById(newRoomId).lean(),
      Bed.findById(admission.bedId),
    ]);

    if (!newWard) return notFound(res, "New ward not found.");
    if (!newRoom) return notFound(res, "New room not found.");
    if (String(newRoom.wardId) !== String(newWardId)) {
      return badRequest(res, "Selected new room does not belong to the selected new ward.");
    }

    const { bed: newBed, error } = await getAvailableBed({
      wardId: newWardId,
      roomId: newRoomId,
      bedId: newBedId,
    });
    if (error) return badRequest(res, error);

    if (String(admission.bedId) === String(newBedId)) {
      return badRequest(res, "Patient is already assigned to this bed.");
    }

    const fromWardId = admission.wardId;
    const fromRoomId = admission.roomId;
    const fromBedId = admission.bedId;

    const oldBedPreviousStatus = oldBed?.bedStatus;
    const newBedPreviousStatus = newBed.bedStatus;

    try {
      if (oldBed) {
        oldBed.bedStatus = oldBedAfterTransferStatus;
        await oldBed.save();
      }

      newBed.bedStatus = "Occupied";
      await newBed.save();

      admission.wardId = newWardId;
      admission.roomId = newRoomId;
      admission.bedId = newBedId;
      admission.status = "Transferred";
      admission.updatedBy = actorId(req);
      admission.transferHistory.push({
        fromWardId,
        fromRoomId,
        fromBedId,
        toWardId: newWardId,
        toRoomId: newRoomId,
        toBedId: newBedId,
        transferReason,
        transferDate: new Date(),
        transferredBy: actorId(req),
      });
      await admission.save();
    } catch (err) {
      if (oldBed && oldBedPreviousStatus) {
        oldBed.bedStatus = oldBedPreviousStatus;
        await oldBed.save().catch((rollbackErr) =>
          console.error("transferAdmission old bed rollback failed:", rollbackErr)
        );
      }
      newBed.bedStatus = newBedPreviousStatus;
      await newBed.save().catch((rollbackErr) =>
        console.error("transferAdmission new bed rollback failed:", rollbackErr)
      );
      throw err;
    }

    const populated = await populateAdmission(Admission.findById(admission._id)).lean();

    return res.json({
      success: true,
      message: "Admission transferred successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("transferAdmission error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while transferring admission.",
    });
  }
}

export async function dischargeAdmission(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid admission id.");

    const dischargeSummary = cleanString(req.body?.dischargeSummary);
    const finalStatus = cleanString(req.body?.finalStatus);
    const bedAfterDischargeStatus = cleanString(req.body?.bedAfterDischargeStatus) || "Cleaning";

    if (!dischargeSummary) return badRequest(res, "Discharge summary is required.");
    if (!FINAL_STATUSES.includes(finalStatus)) return badRequest(res, "Invalid final status.");
    if (!BED_RELEASE_STATUSES.includes(bedAfterDischargeStatus)) {
      return badRequest(res, "Bed after discharge status must be Cleaning or Available.");
    }

    const admission = await Admission.findById(id);
    if (!admission) return notFound(res, "Admission not found.");
    if (admission.status === "Discharged") {
      return badRequest(res, "This admission is already discharged.");
    }

    const dischargeDate = parseDate(req.body?.dischargeDate) || new Date();
    const bed = await Bed.findById(admission.bedId);

    const previousAdmission = {
      status: admission.status,
      dischargeDate: admission.dischargeDate,
      dischargeSummary: admission.dischargeSummary,
      finalStatus: admission.finalStatus,
      updatedBy: admission.updatedBy,
    };
    const previousBedStatus = bed?.bedStatus;

    try {
      admission.status = "Discharged";
      admission.dischargeDate = dischargeDate;
      admission.dischargeSummary = dischargeSummary;
      admission.finalStatus = finalStatus;
      admission.updatedBy = actorId(req);
      await admission.save();

      if (bed) {
        bed.bedStatus = bedAfterDischargeStatus;
        await bed.save();
      }
    } catch (err) {
      admission.status = previousAdmission.status;
      admission.dischargeDate = previousAdmission.dischargeDate;
      admission.dischargeSummary = previousAdmission.dischargeSummary;
      admission.finalStatus = previousAdmission.finalStatus;
      admission.updatedBy = previousAdmission.updatedBy;
      await admission.save().catch((rollbackErr) =>
        console.error("dischargeAdmission admission rollback failed:", rollbackErr)
      );

      if (bed && previousBedStatus) {
        bed.bedStatus = previousBedStatus;
        await bed.save().catch((rollbackErr) =>
          console.error("dischargeAdmission bed rollback failed:", rollbackErr)
        );
      }
      throw err;
    }

    const populated = await populateAdmission(Admission.findById(admission._id)).lean();

    return res.json({
      success: true,
      message: "Admission discharged successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("dischargeAdmission error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while discharging admission.",
    });
  }
}

export async function getNurseAdmissions(req, res) {
  try {
    const nurseId = req.nurse?._id || req.nurse?.id;
    if (!nurseId) {
      return res.status(401).json({
        success: false,
        message: "Nurse authentication required.",
      });
    }

    const admissions = await populateAdmission(
      Admission.find({ nurseId, status: { $in: ACTIVE_ADMISSION_STATUSES } }).sort({
        admissionDate: -1,
        createdAt: -1,
      })
    ).lean();

    const admissionIds = admissions.map((admission) => admission._id);
    const latestNotes = admissionIds.length
      ? await NursingNote.aggregate([
          { $match: { admissionId: { $in: admissionIds } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$admissionId",
              noteTitle: { $first: "$noteTitle" },
              patientCondition: { $first: "$patientCondition" },
              createdAt: { $first: "$createdAt" },
            },
          },
        ])
      : [];

    const latestNoteByAdmission = new Map(
      latestNotes.map((note) => [String(note._id), note])
    );

    return res.json({
      success: true,
      message: "Ward patients loaded successfully.",
      data: admissions.map((admission) => ({
        ...admission,
        latestNursingNote: latestNoteByAdmission.get(String(admission._id)) || null,
      })),
    });
  } catch (err) {
    console.error("getNurseAdmissions error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading ward patients.",
    });
  }
}

export async function getDoctorAdmissions(req, res) {
  try {
    const doctorId = req.doctor?._id || req.doctor?.id;
    if (!doctorId) {
      return res.status(401).json({
        success: false,
        message: "Doctor authentication required.",
      });
    }

    const admissions = await populateAdmission(
      Admission.find({ doctorId }).sort({ admissionDate: -1, createdAt: -1 })
    ).lean();

    const admissionIds = admissions.map((admission) => admission._id);
    const notes = admissionIds.length
      ? await populateNote(
          NursingNote.find({ admissionId: { $in: admissionIds } }).sort({
            createdAt: -1,
          })
        ).lean()
      : [];

    const notesByAdmission = new Map();
    notes.forEach((note) => {
      const key = String(note.admissionId);
      const current = notesByAdmission.get(key) || [];
      current.push(note);
      notesByAdmission.set(key, current);
    });

    return res.json({
      success: true,
      message: "Admitted patients loaded successfully.",
      data: admissions.map((admission) => {
        const nursingNotes = notesByAdmission.get(String(admission._id)) || [];
        return {
          ...admission,
          nursingNotes,
          latestNursingNote: nursingNotes[0] || null,
        };
      }),
    });
  } catch (err) {
    console.error("getDoctorAdmissions error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading admitted patients.",
    });
  }
}

export async function getMyAdmission(req, res) {
  try {
    const clerkUserId = resolveClerkUserId(req);
    if (!clerkUserId) {
      return res.status(401).json({
        success: false,
        message: "Patient authentication required.",
      });
    }

    const patient = await PatientProfile.findOne({ clerkUserId }).lean();
    if (!patient) {
      return res.json({
        success: true,
        message: "Patient profile not found. No admission records available.",
        activeAdmission: null,
        history: [],
      });
    }

    const admissions = await populateAdmission(
      Admission.find({ patientId: patient._id }).sort({ admissionDate: -1, createdAt: -1 })
    ).lean();

    const activeAdmission =
      admissions.find((admission) => ACTIVE_ADMISSION_STATUSES.includes(admission.status)) || null;

    const activeAdmissionId = activeAdmission ? String(activeAdmission._id) : "";
    const history = admissions.filter((admission) => String(admission._id) !== activeAdmissionId);

    return res.json({
      success: true,
      message: "Admission details loaded successfully.",
      activeAdmission,
      history,
    });
  } catch (err) {
    console.error("getMyAdmission error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading admission details.",
    });
  }
}

export async function getNursingNotes(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid admission id.");

    const admission = await Admission.findById(id).lean();
    if (!admission) return notFound(res, "Admission not found.");
    if (String(admission.nurseId || "") !== String(req.nurse?._id || req.nurse?.id || "")) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this admission.",
      });
    }

    const notes = await populateNote(
      NursingNote.find({ admissionId: id }).sort({ createdAt: -1 })
    ).lean();

    return res.json({
      success: true,
      message: "Nursing notes loaded successfully.",
      data: notes,
    });
  } catch (err) {
    console.error("getNursingNotes error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading nursing notes.",
    });
  }
}

export async function createNursingNote(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid admission id.");

    const admission = await Admission.findById(id).lean();
    if (!admission) return notFound(res, "Admission not found.");
    if (String(admission.nurseId || "") !== String(req.nurse?._id || req.nurse?.id || "")) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this admission.",
      });
    }

    const noteTitle = cleanString(req.body?.noteTitle);
    const noteDescription = cleanString(req.body?.noteDescription);
    const patientCondition = cleanString(req.body?.patientCondition) || "Stable";

    if (!noteTitle) return badRequest(res, "Note title is required.");
    if (!noteDescription) return badRequest(res, "Note description is required.");
    if (!PATIENT_CONDITIONS.includes(patientCondition)) {
      return badRequest(res, "Invalid patient condition.");
    }

    const note = await NursingNote.create({
      admissionId: admission._id,
      patientId: admission.patientId,
      nurseId: req.nurse._id,
      noteTitle,
      noteDescription,
      patientCondition,
      createdBy: req.nurse._id,
    });

    const populated = await populateNote(NursingNote.findById(note._id)).lean();

    return res.status(201).json({
      success: true,
      message: "Nursing note added successfully.",
      data: populated,
    });
  } catch (err) {
    console.error("createNursingNote error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while adding nursing note.",
    });
  }
}

export async function updateBedStatusByNurse(req, res) {
  try {
    const { bedId } = req.params;
    if (!isValidObjectId(bedId)) return badRequest(res, "Invalid bed id.");

    const bedStatus = cleanString(req.body?.bedStatus);
    if (!bedStatus) return badRequest(res, "Bed status is required.");

    const bed = await Bed.findById(bedId);
    if (!bed) return notFound(res, "Bed not found.");

    if (bed.bedStatus === "Occupied") {
      return badRequest(res, "Occupied beds cannot be changed by nurses.");
    }

    const allowedNextStatuses = SAFE_NURSE_BED_TRANSITIONS[bed.bedStatus] || [];
    if (!allowedNextStatuses.includes(bedStatus)) {
      return badRequest(
        res,
        `Bed status cannot be changed from ${bed.bedStatus} to ${bedStatus}.`
      );
    }

    bed.bedStatus = bedStatus;
    await bed.save();

    return res.json({
      success: true,
      message: "Bed status updated successfully.",
      data: bed,
    });
  } catch (err) {
    console.error("updateBedStatusByNurse error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating bed status.",
    });
  }
}
