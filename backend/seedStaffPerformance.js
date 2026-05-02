import mongoose from "mongoose";
import StaffPerformance from "./models/StaffPerformance.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/medicare";

const sampleRecords = [
  {
    staffId: "REV-DR-1024",
    staffName: "Dr. Maya Haddad",
    role: "Doctor",
    department: "Cardiology",
    shift: "Morning",
    attendance: "Present",
    date: "2026-05-02",
    utilization: 92,
    performanceStatus: "Excellent",
  },
  {
    staffId: "REV-NU-2148",
    staffName: "Nour Saliba",
    role: "Nurse",
    department: "Emergency",
    shift: "Night",
    attendance: "Present",
    date: "2026-05-02",
    utilization: 88,
    performanceStatus: "Excellent",
  },
  {
    staffId: "REV-DR-1187",
    staffName: "Dr. Karim Mansour",
    role: "Doctor",
    department: "Neurology",
    shift: "Evening",
    attendance: "Present",
    date: "2026-05-02",
    utilization: 79,
    performanceStatus: "Good",
  },
  {
    staffId: "REV-NU-2306",
    staffName: "Lara Khoury",
    role: "Nurse",
    department: "Pediatrics",
    shift: "Morning",
    attendance: "Absent",
    date: "2026-05-02",
    utilization: 0,
    performanceStatus: "Needs Review",
  },
  {
    staffId: "REV-ST-3412",
    staffName: "Omar Karam",
    role: "Staff",
    department: "Radiology",
    shift: "Evening",
    attendance: "Present",
    date: "2026-05-02",
    utilization: 74,
    performanceStatus: "Good",
  },
  {
    staffId: "REV-NU-2275",
    staffName: "Rima Nasser",
    role: "Nurse",
    department: "ICU",
    shift: "Night",
    attendance: "Present",
    date: "2026-05-02",
    utilization: 95,
    performanceStatus: "Excellent",
  },
  {
    staffId: "REV-DR-1092",
    staffName: "Dr. Elias Daher",
    role: "Doctor",
    department: "Emergency",
    shift: "Morning",
    attendance: "Absent",
    date: "2026-05-02",
    utilization: 0,
    performanceStatus: "Needs Review",
  },
  {
    staffId: "REV-ST-3520",
    staffName: "Tala Sayegh",
    role: "Staff",
    department: "Admissions",
    shift: "Morning",
    attendance: "Present",
    date: "2026-05-02",
    utilization: 68,
    performanceStatus: "Good",
  },
  {
    staffId: "REV-NU-2401",
    staffName: "Hadi Farah",
    role: "Nurse",
    department: "Surgery",
    shift: "Evening",
    attendance: "Present",
    date: "2026-05-02",
    utilization: 84,
    performanceStatus: "Good",
  },
  {
    staffId: "REV-DR-1218",
    staffName: "Dr. Sara Mokdad",
    role: "Doctor",
    department: "Pediatrics",
    shift: "Night",
    attendance: "Present",
    date: "2026-05-02",
    utilization: 81,
    performanceStatus: "Good",
  },
  {
    staffId: "REV-ST-3614",
    staffName: "Mazen Harb",
    role: "Staff",
    department: "Laboratory",
    shift: "Morning",
    attendance: "Present",
    date: "2026-05-01",
    utilization: 77,
    performanceStatus: "Good",
  },
  {
    staffId: "REV-NU-2462",
    staffName: "Dina Barakat",
    role: "Nurse",
    department: "Cardiology",
    shift: "Evening",
    attendance: "Present",
    date: "2026-05-01",
    utilization: 86,
    performanceStatus: "Excellent",
  },
];

async function seedStaffPerformance() {
  try {
    await mongoose.connect(MONGO_URI);

    let inserted = 0;
    for (const record of sampleRecords) {
      const existing = await StaffPerformance.findOne({
        staffId: record.staffId,
        date: new Date(record.date),
        shift: record.shift,
      }).lean();

      if (!existing) {
        await StaffPerformance.create(record);
        inserted += 1;
      }
    }

    console.log(
      `Staff performance seed complete. Inserted ${inserted} new records.`,
    );
  } catch (err) {
    console.error("Staff performance seed failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedStaffPerformance();
