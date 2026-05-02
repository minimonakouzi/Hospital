import express from "express";
import { clerkMiddleware } from "@clerk/express";
import {
  admitPatient,
  dischargeAdmission,
  getAdmissionById,
  getAdmissionStats,
  getAdmissions,
  getDoctorAdmissions,
  getMyAdmission,
  getNurseAdmissions,
  getNursingNotes,
  lookupNurses,
  lookupPatients,
  createNursingNote,
  transferAdmission,
  updateBedStatusByNurse,
} from "../controllers/admissionController.js";
import nurseAuth from "../middlewares/nurseAuth.js";
import staffAuth from "../middlewares/staffAuth.js";
import doctorAuth from "../middlewares/doctorAuth.js";

const admissionRouter = express.Router();

admissionRouter.get("/", staffAuth, getAdmissions);
admissionRouter.get("/stats", staffAuth, getAdmissionStats);
admissionRouter.get("/lookups/patients", staffAuth, lookupPatients);
admissionRouter.get("/lookups/nurses", staffAuth, lookupNurses);
admissionRouter.get("/nurse", nurseAuth, getNurseAdmissions);
admissionRouter.get("/doctor", doctorAuth, getDoctorAdmissions);
admissionRouter.get("/my-admission", clerkMiddleware(), getMyAdmission);
admissionRouter.post("/admit", staffAuth, admitPatient);
admissionRouter.put("/beds/:bedId/status", nurseAuth, updateBedStatusByNurse);
admissionRouter.get("/:id/nursing-notes", nurseAuth, getNursingNotes);
admissionRouter.post("/:id/nursing-notes", nurseAuth, createNursingNote);
admissionRouter.get("/:id", staffAuth, getAdmissionById);
admissionRouter.put("/:id/transfer", staffAuth, transferAdmission);
admissionRouter.put("/:id/discharge", staffAuth, dischargeAdmission);

export default admissionRouter;
