import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { getAuditLogs } from "../controllers/auditLogController.js";
import adminAuth from "../middlewares/adminAuth.js";

const auditLogRouter = express.Router();

auditLogRouter.get("/", clerkMiddleware(), requireAuth(), adminAuth, getAuditLogs);

export default auditLogRouter;
