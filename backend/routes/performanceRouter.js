import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  createPerformanceAttendance,
  deletePerformanceAttendance,
  getPerformanceAttendance,
  getPerformanceSummary,
  updatePerformanceAttendance,
} from "../controllers/performanceController.js";
import adminAuth from "../middlewares/adminAuth.js";

const performanceRouter = express.Router();
const protectAdmin = [clerkMiddleware(), requireAuth(), adminAuth];

performanceRouter.get("/summary", protectAdmin, getPerformanceSummary);
performanceRouter.post("/attendance", protectAdmin, createPerformanceAttendance);
performanceRouter.get("/attendance", protectAdmin, getPerformanceAttendance);
performanceRouter.put("/attendance/:id", protectAdmin, updatePerformanceAttendance);
performanceRouter.delete("/attendance/:id", protectAdmin, deletePerformanceAttendance);

export default performanceRouter;
