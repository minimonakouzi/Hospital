import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  cancelPrescription,
  createPrescription,
  getDoctorPrescriptionById,
  getDoctorPrescriptions,
  getMyPrescriptionById,
  getMyPrescriptions,
  lookupPrescriptionPatients,
  updatePrescription,
} from "../controllers/prescriptionController.js";
import doctorAuth from "../middlewares/doctorAuth.js";

const prescriptionRouter = express.Router();

prescriptionRouter.post("/", doctorAuth, createPrescription);
prescriptionRouter.get("/doctor/patients", doctorAuth, lookupPrescriptionPatients);
prescriptionRouter.get("/doctor", doctorAuth, getDoctorPrescriptions);
prescriptionRouter.get("/doctor/:id", doctorAuth, getDoctorPrescriptionById);
prescriptionRouter.get("/my", clerkMiddleware(), requireAuth(), getMyPrescriptions);
prescriptionRouter.get("/my/:id", clerkMiddleware(), requireAuth(), getMyPrescriptionById);
prescriptionRouter.put("/:id/cancel", doctorAuth, cancelPrescription);
prescriptionRouter.put("/:id", doctorAuth, updatePrescription);

export default prescriptionRouter;
