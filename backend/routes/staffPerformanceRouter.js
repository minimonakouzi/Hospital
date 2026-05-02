import express from "express";
import {
  addStaffPerformanceRecord,
  deleteStaffPerformanceRecord,
  getStaffPerformanceRecords,
  getStaffPerformanceSummary,
  updateStaffPerformanceRecord,
} from "../controllers/staffPerformanceController.js";

const staffPerformanceRouter = express.Router();

staffPerformanceRouter.get("/", getStaffPerformanceRecords);
staffPerformanceRouter.get("/summary", getStaffPerformanceSummary);
staffPerformanceRouter.post("/", addStaffPerformanceRecord);
staffPerformanceRouter.put("/:id", updateStaffPerformanceRecord);
staffPerformanceRouter.delete("/:id", deleteStaffPerformanceRecord);

export default staffPerformanceRouter;
