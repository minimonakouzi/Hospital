import mongoose from "mongoose";
import Admission from "../models/Admission.js";
import Bed from "../models/Bed.js";
import Room from "../models/Room.js";
import Ward from "../models/Ward.js";

const WARD_TYPES = ["General", "ICU", "Emergency", "Surgery", "Maternity", "Pediatric"];
const WARD_STATUSES = ["Active", "Under Maintenance", "Closed"];
const ROOM_TYPES = ["Private", "Shared", "ICU", "Emergency"];
const ROOM_STATUSES = ["Available", "Full", "Maintenance"];
const BED_STATUSES = ["Available", "Occupied", "Cleaning", "Maintenance"];
const ACTIVE_ADMISSION_STATUSES = ["Active", "Transferred"];

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message) {
  return res.status(404).json({ success: false, message });
}

function normalizeEnum(value, allowed, fallback = "") {
  const cleaned = cleanString(value);
  if (!cleaned) return fallback;
  return allowed.includes(cleaned) ? cleaned : null;
}

function duplicateKeyMessage(err, fallback) {
  if (err?.code === 11000 || String(err?.message || "").includes("E11000")) {
    return fallback;
  }
  return null;
}

function mapWardWithRoomsAndBeds(ward, rooms = [], beds = []) {
  const wardId = String(ward._id);
  const wardRooms = rooms
    .filter((room) => String(room.wardId) === wardId)
    .map((room) => {
      const roomId = String(room._id);
      return {
        ...room,
        beds: beds.filter((bed) => String(bed.roomId) === roomId),
      };
    });

  return {
    ...ward,
    rooms: wardRooms,
    beds: beds.filter((bed) => String(bed.wardId) === wardId),
  };
}

async function activeAdmissionExists(filter) {
  return Boolean(
    await Admission.exists({
      ...filter,
      status: { $in: ACTIVE_ADMISSION_STATUSES },
    })
  );
}

async function wardWithChildren(wardId, bedStatus = "") {
  const ward = await Ward.findById(wardId).lean();
  if (!ward) return null;

  const rooms = await Room.find({ wardId }).sort({ roomNumber: 1 }).lean();
  const roomIds = rooms.map((room) => room._id);
  const bedMatch = roomIds.length ? { roomId: { $in: roomIds } } : { _id: null };
  if (bedStatus) bedMatch.bedStatus = bedStatus;
  const beds = await Bed.find(bedMatch).sort({ bedNumber: 1 }).lean();

  return mapWardWithRoomsAndBeds(ward, rooms, beds);
}

export async function getWards(req, res) {
  try {
    const search = cleanString(req.query.search);
    const wardType = cleanString(req.query.wardType);
    const floorNumber = cleanString(req.query.floorNumber);
    const status = cleanString(req.query.status);
    const bedStatus = cleanString(req.query.bedStatus);

    const wardMatch = {};
    if (search) {
      const re = new RegExp(search, "i");
      wardMatch.$or = [{ wardName: re }, { description: re }, { floorNumber: re }];
    }
    if (wardType && wardType !== "All") wardMatch.wardType = wardType;
    if (floorNumber && floorNumber !== "All") wardMatch.floorNumber = floorNumber;
    if (status && status !== "All") wardMatch.status = status;

    let wards = await Ward.find(wardMatch).sort({ floorNumber: 1, wardName: 1 }).lean();
    let wardIds = wards.map((ward) => ward._id);

    let rooms = wardIds.length
      ? await Room.find({ wardId: { $in: wardIds } }).sort({ roomNumber: 1 }).lean()
      : [];

    const roomIds = rooms.map((room) => room._id);
    const bedMatch = roomIds.length ? { roomId: { $in: roomIds } } : { _id: null };
    if (bedStatus && bedStatus !== "All") bedMatch.bedStatus = bedStatus;

    let beds = await Bed.find(bedMatch).sort({ bedNumber: 1 }).lean();

    if (bedStatus && bedStatus !== "All") {
      const matchingRoomIds = new Set(beds.map((bed) => String(bed.roomId)));
      const matchingWardIds = new Set(beds.map((bed) => String(bed.wardId)));
      rooms = rooms.filter((room) => matchingRoomIds.has(String(room._id)));
      wards = wards.filter((ward) => matchingWardIds.has(String(ward._id)));
      wardIds = wards.map((ward) => ward._id);
    }

    return res.json({
      success: true,
      message: "Wards loaded successfully.",
      data: wards.map((ward) => mapWardWithRoomsAndBeds(ward, rooms, beds)),
    });
  } catch (err) {
    console.error("getWards error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading wards.",
    });
  }
}

export async function getWardById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid ward id.");

    const ward = await wardWithChildren(id);
    if (!ward) return notFound(res, "Ward not found.");

    return res.json({
      success: true,
      message: "Ward loaded successfully.",
      data: ward,
    });
  } catch (err) {
    console.error("getWardById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading ward.",
    });
  }
}

export async function createWard(req, res) {
  try {
    const wardName = cleanString(req.body?.wardName);
    const wardType = normalizeEnum(req.body?.wardType, WARD_TYPES);
    const floorNumber = cleanString(req.body?.floorNumber);
    const status = normalizeEnum(req.body?.status, WARD_STATUSES, "Active");

    if (!wardName || !wardType || !floorNumber) {
      return badRequest(res, "Ward name, ward type, and floor number are required.");
    }
    if (wardType === null) return badRequest(res, "Invalid ward type.");
    if (status === null) return badRequest(res, "Invalid ward status.");

    const ward = await Ward.create({
      wardName,
      wardType,
      floorNumber,
      description: cleanString(req.body?.description),
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Ward created successfully.",
      data: ward,
    });
  } catch (err) {
    console.error("createWard error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating ward.",
    });
  }
}

export async function updateWard(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid ward id.");

    const ward = await Ward.findById(id);
    if (!ward) return notFound(res, "Ward not found.");

    if (req.body?.wardName !== undefined) ward.wardName = cleanString(req.body.wardName);
    if (req.body?.wardType !== undefined) {
      const wardType = normalizeEnum(req.body.wardType, WARD_TYPES);
      if (!wardType) return badRequest(res, "Invalid ward type.");
      ward.wardType = wardType;
    }
    if (req.body?.floorNumber !== undefined) ward.floorNumber = cleanString(req.body.floorNumber);
    if (req.body?.description !== undefined) ward.description = cleanString(req.body.description);
    if (req.body?.status !== undefined) {
      const status = normalizeEnum(req.body.status, WARD_STATUSES);
      if (!status) return badRequest(res, "Invalid ward status.");
      ward.status = status;
    }

    if (!ward.wardName || !ward.wardType || !ward.floorNumber) {
      return badRequest(res, "Ward name, ward type, and floor number are required.");
    }

    await ward.save();

    return res.json({
      success: true,
      message: "Ward updated successfully.",
      data: ward,
    });
  } catch (err) {
    console.error("updateWard error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating ward.",
    });
  }
}

export async function deleteWard(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badRequest(res, "Invalid ward id.");

    const ward = await Ward.findById(id);
    if (!ward) return notFound(res, "Ward not found.");

    const hasOccupiedBeds = await Bed.exists({ wardId: id, bedStatus: "Occupied" });
    if (hasOccupiedBeds) {
      return badRequest(res, "This ward cannot be deleted because it has occupied beds.");
    }

    const hasActiveAdmissions = await activeAdmissionExists({ wardId: id });
    if (hasActiveAdmissions) {
      return badRequest(res, "This ward cannot be deleted because it has active admissions.");
    }

    const rooms = await Room.find({ wardId: id }).select("_id").lean();
    const roomIds = rooms.map((room) => room._id);
    if (roomIds.length) await Bed.deleteMany({ roomId: { $in: roomIds } });
    await Room.deleteMany({ wardId: id });
    await Ward.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Ward deleted successfully.",
      data: { id },
    });
  } catch (err) {
    console.error("deleteWard error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting ward.",
    });
  }
}

export async function createRoom(req, res) {
  try {
    const { wardId } = req.params;
    if (!isValidObjectId(wardId)) return badRequest(res, "Invalid ward id.");

    const ward = await Ward.findById(wardId).lean();
    if (!ward) return notFound(res, "Ward not found.");

    const roomNumber = cleanString(req.body?.roomNumber);
    const roomType = normalizeEnum(req.body?.roomType, ROOM_TYPES);
    const floorNumber = cleanString(req.body?.floorNumber);
    const status = normalizeEnum(req.body?.status, ROOM_STATUSES, "Available");

    if (!roomNumber || !roomType || !floorNumber) {
      return badRequest(res, "Room number, room type, and floor number are required.");
    }
    if (roomType === null) return badRequest(res, "Invalid room type.");
    if (status === null) return badRequest(res, "Invalid room status.");

    const duplicate = await Room.exists({ wardId, roomNumber });
    if (duplicate) return badRequest(res, "A room with this number already exists in this ward.");

    const room = await Room.create({ wardId, roomNumber, roomType, floorNumber, status });

    return res.status(201).json({
      success: true,
      message: "Room created successfully.",
      data: room,
    });
  } catch (err) {
    const duplicateMessage = duplicateKeyMessage(
      err,
      "A room with this number already exists in this ward."
    );
    if (duplicateMessage) return badRequest(res, duplicateMessage);

    console.error("createRoom error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating room.",
    });
  }
}

export async function updateRoom(req, res) {
  try {
    const { wardId, roomId } = req.params;
    if (!isValidObjectId(wardId)) return badRequest(res, "Invalid ward id.");
    if (!isValidObjectId(roomId)) return badRequest(res, "Invalid room id.");

    const room = await Room.findOne({ _id: roomId, wardId });
    if (!room) return notFound(res, "Room not found in this ward.");

    if (req.body?.roomNumber !== undefined) {
      const roomNumber = cleanString(req.body.roomNumber);
      if (!roomNumber) return badRequest(res, "Room number is required.");
      const duplicate = await Room.exists({
        wardId,
        roomNumber,
        _id: { $ne: roomId },
      });
      if (duplicate) return badRequest(res, "A room with this number already exists in this ward.");
      room.roomNumber = roomNumber;
    }

    if (req.body?.roomType !== undefined) {
      const roomType = normalizeEnum(req.body.roomType, ROOM_TYPES);
      if (!roomType) return badRequest(res, "Invalid room type.");
      room.roomType = roomType;
    }
    if (req.body?.floorNumber !== undefined) room.floorNumber = cleanString(req.body.floorNumber);
    if (req.body?.status !== undefined) {
      const status = normalizeEnum(req.body.status, ROOM_STATUSES);
      if (!status) return badRequest(res, "Invalid room status.");
      room.status = status;
    }

    if (!room.roomNumber || !room.roomType || !room.floorNumber) {
      return badRequest(res, "Room number, room type, and floor number are required.");
    }

    await room.save();

    return res.json({
      success: true,
      message: "Room updated successfully.",
      data: room,
    });
  } catch (err) {
    const duplicateMessage = duplicateKeyMessage(
      err,
      "A room with this number already exists in this ward."
    );
    if (duplicateMessage) return badRequest(res, duplicateMessage);

    console.error("updateRoom error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating room.",
    });
  }
}

export async function deleteRoom(req, res) {
  try {
    const { wardId, roomId } = req.params;
    if (!isValidObjectId(wardId)) return badRequest(res, "Invalid ward id.");
    if (!isValidObjectId(roomId)) return badRequest(res, "Invalid room id.");

    const room = await Room.findOne({ _id: roomId, wardId });
    if (!room) return notFound(res, "Room not found in this ward.");

    const hasOccupiedBeds = await Bed.exists({ roomId, bedStatus: "Occupied" });
    if (hasOccupiedBeds) {
      return badRequest(res, "This room cannot be deleted because it has occupied beds.");
    }

    const hasActiveAdmissions = await activeAdmissionExists({ roomId });
    if (hasActiveAdmissions) {
      return badRequest(res, "This room cannot be deleted because it has active admissions.");
    }

    await Bed.deleteMany({ roomId });
    await Room.findByIdAndDelete(roomId);

    return res.json({
      success: true,
      message: "Room deleted successfully.",
      data: { id: roomId },
    });
  } catch (err) {
    console.error("deleteRoom error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting room.",
    });
  }
}

export async function createBed(req, res) {
  try {
    const { wardId, roomId } = req.params;
    if (!isValidObjectId(wardId)) return badRequest(res, "Invalid ward id.");
    if (!isValidObjectId(roomId)) return badRequest(res, "Invalid room id.");

    const room = await Room.findOne({ _id: roomId, wardId }).lean();
    if (!room) return notFound(res, "Room not found in this ward.");

    const bedNumber = cleanString(req.body?.bedNumber);
    const bedStatus = normalizeEnum(req.body?.bedStatus, BED_STATUSES, "Available");
    if (!bedNumber) return badRequest(res, "Bed number is required.");
    if (bedStatus === null) return badRequest(res, "Invalid bed status.");

    const duplicate = await Bed.exists({ roomId, bedNumber });
    if (duplicate) return badRequest(res, "A bed with this number already exists in this room.");

    const bed = await Bed.create({
      wardId,
      roomId,
      bedNumber,
      bedStatus,
      notes: cleanString(req.body?.notes),
    });

    return res.status(201).json({
      success: true,
      message: "Bed created successfully.",
      data: bed,
    });
  } catch (err) {
    const duplicateMessage = duplicateKeyMessage(
      err,
      "A bed with this number already exists in this room."
    );
    if (duplicateMessage) return badRequest(res, duplicateMessage);

    console.error("createBed error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating bed.",
    });
  }
}

export async function updateBed(req, res) {
  try {
    const { wardId, roomId, bedId } = req.params;
    if (!isValidObjectId(wardId)) return badRequest(res, "Invalid ward id.");
    if (!isValidObjectId(roomId)) return badRequest(res, "Invalid room id.");
    if (!isValidObjectId(bedId)) return badRequest(res, "Invalid bed id.");

    const bed = await Bed.findOne({ _id: bedId, wardId, roomId });
    if (!bed) return notFound(res, "Bed not found in this room.");

    const hasActiveAdmission = await activeAdmissionExists({ bedId });

    if (req.body?.bedNumber !== undefined) {
      const bedNumber = cleanString(req.body.bedNumber);
      if (!bedNumber) return badRequest(res, "Bed number is required.");
      const duplicate = await Bed.exists({
        roomId,
        bedNumber,
        _id: { $ne: bedId },
      });
      if (duplicate) return badRequest(res, "A bed with this number already exists in this room.");
      bed.bedNumber = bedNumber;
    }

    if (req.body?.bedStatus !== undefined) {
      const bedStatus = normalizeEnum(req.body.bedStatus, BED_STATUSES);
      if (!bedStatus) return badRequest(res, "Invalid bed status.");

      if (bedStatus === "Maintenance" && bed.bedStatus === "Occupied") {
        return badRequest(res, "An occupied bed cannot be marked as maintenance.");
      }

      if (bedStatus === "Available" && hasActiveAdmission) {
        return badRequest(res, "This bed cannot be marked available because it has an active admission.");
      }

      bed.bedStatus = bedStatus;
    }

    if (req.body?.notes !== undefined) bed.notes = cleanString(req.body.notes);

    await bed.save();

    return res.json({
      success: true,
      message: "Bed updated successfully.",
      data: bed,
    });
  } catch (err) {
    const duplicateMessage = duplicateKeyMessage(
      err,
      "A bed with this number already exists in this room."
    );
    if (duplicateMessage) return badRequest(res, duplicateMessage);

    console.error("updateBed error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating bed.",
    });
  }
}

export async function deleteBed(req, res) {
  try {
    const { wardId, roomId, bedId } = req.params;
    if (!isValidObjectId(wardId)) return badRequest(res, "Invalid ward id.");
    if (!isValidObjectId(roomId)) return badRequest(res, "Invalid room id.");
    if (!isValidObjectId(bedId)) return badRequest(res, "Invalid bed id.");

    const bed = await Bed.findOne({ _id: bedId, wardId, roomId });
    if (!bed) return notFound(res, "Bed not found in this room.");

    if (bed.bedStatus === "Occupied") {
      return badRequest(res, "This bed cannot be deleted because it is occupied.");
    }

    const hasActiveAdmission = await activeAdmissionExists({ bedId });
    if (hasActiveAdmission) {
      return badRequest(res, "This bed cannot be deleted because it has an active admission.");
    }

    await Bed.findByIdAndDelete(bedId);

    return res.json({
      success: true,
      message: "Bed deleted successfully.",
      data: { id: bedId },
    });
  } catch (err) {
    console.error("deleteBed error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting bed.",
    });
  }
}

export async function getWardStats(req, res) {
  try {
    const [
      totalWards,
      totalRooms,
      totalBeds,
      availableBeds,
      occupiedBeds,
      cleaningBeds,
      maintenanceBeds,
    ] = await Promise.all([
      Ward.countDocuments(),
      Room.countDocuments(),
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
        totalWards,
        totalRooms,
        totalBeds,
        availableBeds,
        occupiedBeds,
        cleaningBeds,
        maintenanceBeds,
        occupancyPercentage: Number.isFinite(occupancyPercentage)
          ? occupancyPercentage
          : 0,
      },
    });
  } catch (err) {
    console.error("getWardStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading ward stats.",
    });
  }
}
