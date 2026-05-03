// routes/serviceAppointmentRouter.js
import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import adminAuth from "../middlewares/adminAuth.js";
import staffAuth from "../middlewares/staffAuth.js";

import {
  getServiceAppointments,
  getServiceAppointmentById,
  createServiceAppointment,
  confirmServicePayment,
  updateServiceAppointment,
  updateServiceAppointmentStatus,
  cancelServiceAppointment,
  deleteServiceAppointment,
  getServiceAppointmentStats,
  getServiceAppointmentsByPatient,
} from "../controllers/serviceAppointmentController.js";

const router = express.Router();

/* FIXED ROUTES FIRST */
router.get("/", clerkMiddleware(), requireAuth(), adminAuth, getServiceAppointments);
router.get("/confirm", confirmServicePayment);
router.get("/stats/summary", clerkMiddleware(), requireAuth(), adminAuth, getServiceAppointmentStats);
router.get("/staff", staffAuth, getServiceAppointments);

router.post("/", clerkMiddleware(), requireAuth(), createServiceAppointment);

// 🔥 MUST BE BEFORE :id
router.get(
  "/me",
  clerkMiddleware(),
  requireAuth(),
  getServiceAppointmentsByPatient
);

/* ID ROUTES LAST */
router.get("/:id", getServiceAppointmentById);
router.patch("/:id/status", staffAuth, updateServiceAppointmentStatus);
router.put("/:id", updateServiceAppointment);
router.post("/:id/cancel", cancelServiceAppointment);
router.delete("/:id", clerkMiddleware(), requireAuth(), adminAuth, deleteServiceAppointment);

export default router;
