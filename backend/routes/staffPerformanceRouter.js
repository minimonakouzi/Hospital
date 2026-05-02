import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  createStaffAttendanceRecord,
  deleteStaffAttendanceRecord,
  getStaffAttendanceRecords,
  getStaffPerformanceSummary,
  updateStaffAttendanceRecord,
} from "../controllers/staffPerformanceController.js";
import adminAuth from "../middlewares/adminAuth.js";

const staffPerformanceRouter = express.Router();
const protectAdmin = [clerkMiddleware(), requireAuth(), adminAuth];

staffPerformanceRouter.get("/summary", protectAdmin, getStaffPerformanceSummary);
staffPerformanceRouter.post("/attendance", protectAdmin, createStaffAttendanceRecord);
staffPerformanceRouter.get("/attendance", protectAdmin, getStaffAttendanceRecords);
staffPerformanceRouter.put("/attendance/:id", protectAdmin, updateStaffAttendanceRecord);
staffPerformanceRouter.delete("/attendance/:id", protectAdmin, deleteStaffAttendanceRecord);

export default staffPerformanceRouter;
