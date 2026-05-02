import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  createAdminRadiologyReport,
  createDoctorRadiologyReport,
  createStaffRadiologyReport,
  deleteRadiologyReport,
  getAdminRadiologyReportById,
  getAdminRadiologyReports,
  getDoctorRadiologyReportById,
  getDoctorRadiologyReports,
  getMyRadiologyReportById,
  getMyRadiologyReports,
  getStaffRadiologyReports,
  updateStaffRadiologyReport,
} from "../controllers/radiologyReportController.js";
import adminAuth from "../middlewares/adminAuth.js";
import doctorAuth from "../middlewares/doctorAuth.js";
import staffAuth from "../middlewares/staffAuth.js";

const radiologyReportRouter = express.Router();

radiologyReportRouter.get("/my", clerkMiddleware(), getMyRadiologyReports);
radiologyReportRouter.get("/my/:id", clerkMiddleware(), getMyRadiologyReportById);

radiologyReportRouter.post("/doctor", doctorAuth, createDoctorRadiologyReport);
radiologyReportRouter.get("/doctor", doctorAuth, getDoctorRadiologyReports);
radiologyReportRouter.get("/doctor/:id", doctorAuth, getDoctorRadiologyReportById);

radiologyReportRouter.post("/staff", staffAuth, createStaffRadiologyReport);
radiologyReportRouter.get("/staff", staffAuth, getStaffRadiologyReports);
radiologyReportRouter.put("/staff/:id", staffAuth, updateStaffRadiologyReport);
radiologyReportRouter.delete("/staff/:id", staffAuth, deleteRadiologyReport);

radiologyReportRouter.post("/", clerkMiddleware(), requireAuth(), adminAuth, createAdminRadiologyReport);
radiologyReportRouter.get("/", clerkMiddleware(), requireAuth(), adminAuth, getAdminRadiologyReports);
radiologyReportRouter.get("/:id", clerkMiddleware(), requireAuth(), adminAuth, getAdminRadiologyReportById);
radiologyReportRouter.delete("/:id", clerkMiddleware(), requireAuth(), adminAuth, deleteRadiologyReport);

export default radiologyReportRouter;
