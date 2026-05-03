import Admission from "../models/Admission.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import PatientProfile from "../models/PatientProfile.js";
import Service from "../models/Service.js";
import ServiceAppointment from "../models/serviceAppointment.js";
import Staff from "../models/Staff.js";

const LOOKUP_LIMIT = 100;

function cleanString(value) {
  return String(value ?? "").trim();
}

function regex(value) {
  const text = cleanString(value);
  return text ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
}

function idOf(item = {}) {
  return item?._id || item?.id || "";
}

function patientName(patient = {}) {
  return patient?.name || patient?.patientCode || patient?.email || patient?.phone || "Patient";
}

export async function getLookupData(req, res) {
  try {
    const type = cleanString(req.params.type);
    const search = regex(req.query.search);

    if (type === "patients") {
      const match = search
        ? { $or: [{ name: search }, { patientCode: search }, { email: search }, { phone: search }] }
        : {};
      const data = await PatientProfile.find(match)
        .select("_id patientCode name email phone age gender")
        .sort({ patientCode: 1, createdAt: -1 })
        .limit(LOOKUP_LIMIT)
        .lean();
      return res.json({ success: true, data });
    }

    if (type === "doctors") {
      const match = search
        ? { $or: [{ name: search }, { email: search }, { specialization: search }] }
        : {};
      const data = await Doctor.find(match)
        .select("_id name email specialization")
        .sort({ name: 1 })
        .limit(LOOKUP_LIMIT)
        .lean();
      return res.json({ success: true, data });
    }

    if (type === "staff") {
      const match = search
        ? { $or: [{ name: search }, { email: search }, { department: search }, { role: search }] }
        : {};
      const data = await Staff.find(match)
        .select("_id name email department role status")
        .sort({ name: 1 })
        .limit(LOOKUP_LIMIT)
        .lean();
      return res.json({ success: true, data });
    }

    if (type === "admissions") {
      const data = await Admission.find(search ? { $or: [{ status: search }, { reasonForAdmission: search }] } : {})
        .populate("patientId", "patientCode name email phone")
        .populate("wardId", "wardName")
        .populate("roomId", "roomNumber")
        .populate("bedId", "bedNumber")
        .sort({ admissionDate: -1, createdAt: -1 })
        .limit(LOOKUP_LIMIT)
        .lean();
      return res.json({
        success: true,
        data: data
          .filter((item) => !search || search.test(patientName(item.patientId)) || search.test(item.wardId?.wardName || ""))
          .map((item) => ({ ...item, _id: idOf(item) })),
      });
    }

    if (type === "appointments") {
      const match = search
        ? { $or: [{ patientName: search }, { doctorName: search }, { mobile: search }, { status: search }] }
        : {};
      const data = await Appointment.find(match)
        .populate("doctorId", "name email specialization")
        .select("_id patientName mobile doctorName doctorId date time status")
        .sort({ date: -1, createdAt: -1 })
        .limit(LOOKUP_LIMIT)
        .lean();
      return res.json({ success: true, data });
    }

    if (type === "service-appointments") {
      const match = search
        ? { $or: [{ patientName: search }, { serviceName: search }, { mobile: search }, { status: search }] }
        : {};
      const data = await ServiceAppointment.find(match)
        .populate("serviceId", "name")
        .select("_id patientName mobile serviceName serviceId date hour minute ampm status")
        .sort({ date: -1, createdAt: -1 })
        .limit(LOOKUP_LIMIT)
        .lean();
      return res.json({ success: true, data });
    }

    if (type === "services") {
      const match = search ? { $or: [{ name: search }, { shortDescription: search }] } : {};
      const data = await Service.find(match)
        .select("_id name price available")
        .sort({ name: 1 })
        .limit(LOOKUP_LIMIT)
        .lean();
      return res.json({ success: true, data });
    }

    return res.status(404).json({ success: false, message: "Lookup type not found." });
  } catch (err) {
    console.error("getLookupData error:", err);
    return res.status(500).json({ success: false, message: "Server error while loading lookup data." });
  }
}
