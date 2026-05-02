import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  createAdminLabReport,
  createStaffLabReport,
  deleteLabReport,
  getAdminLabReportById,
  getAdminLabReports,
  getDoctorLabReportById,
  getDoctorLabReports,
  getMyLabReportById,
  getMyLabReports,
  getStaffLabReports,
  requestLabReport,
  updateAdminLabReport,
  updateLabReportResult,
  updateLabReportStatus,
} from "../controllers/labReportController.js";
import adminAuth from "../middlewares/adminAuth.js";
import doctorAuth from "../middlewares/doctorAuth.js";
import staffAuth from "../middlewares/staffAuth.js";

const labReportRouter = express.Router();

labReportRouter.get("/my", clerkMiddleware(), getMyLabReports);
labReportRouter.get("/my/:id", clerkMiddleware(), getMyLabReportById);

labReportRouter.post("/request", doctorAuth, requestLabReport);
labReportRouter.get("/doctor", doctorAuth, getDoctorLabReports);
labReportRouter.get("/doctor/:id", doctorAuth, getDoctorLabReportById);

labReportRouter.get("/staff", staffAuth, getStaffLabReports);
labReportRouter.post("/staff", staffAuth, createStaffLabReport);
labReportRouter.put("/staff/:id/result", staffAuth, updateLabReportResult);
labReportRouter.put("/staff/:id/status", staffAuth, updateLabReportStatus);
labReportRouter.delete("/staff/:id", staffAuth, deleteLabReport);

labReportRouter.get("/", clerkMiddleware(), requireAuth(), adminAuth, getAdminLabReports);
labReportRouter.get("/:id", clerkMiddleware(), requireAuth(), adminAuth, getAdminLabReportById);
labReportRouter.post("/", clerkMiddleware(), requireAuth(), adminAuth, createAdminLabReport);
labReportRouter.put("/:id", clerkMiddleware(), requireAuth(), adminAuth, updateAdminLabReport);
labReportRouter.delete("/:id", clerkMiddleware(), requireAuth(), adminAuth, deleteLabReport);

export default labReportRouter;
