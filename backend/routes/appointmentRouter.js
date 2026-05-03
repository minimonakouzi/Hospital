// routes/appointmentRouter.js
import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import adminAuth from "../middlewares/adminAuth.js";

import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  confirmPayment,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  getStats,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  
  getRegisteredUserCount,
} from "../controllers/appointmentController.js";

const appointmentRouter = express.Router();

/* =========================
   PUBLIC / FIXED ROUTES
   ========================= */

// list appointments
appointmentRouter.get("/", clerkMiddleware(), requireAuth(), adminAuth, getAppointments);

// stripe confirm
appointmentRouter.get("/confirm", confirmPayment);

// stats
appointmentRouter.get("/stats/summary", clerkMiddleware(), requireAuth(), adminAuth, getStats);

/* =========================
   AUTHENTICATED ROUTES
   ========================= */

// create appointment
appointmentRouter.post(
  "/",
  clerkMiddleware(),
  requireAuth(),
  createAppointment
);

// 🔥 IMPORTANT: /me MUST COME BEFORE /:id
appointmentRouter.get(
  "/me",
  clerkMiddleware(),
  requireAuth(),
  getAppointmentsByPatient
);
// appointmentRouter.get("/:id", getAppointmentById);
appointmentRouter.get(
  "/doctor/:doctorId",
  getAppointmentsByDoctor
);

appointmentRouter.post("/:id/cancel", cancelAppointment);
appointmentRouter.get("/paitents/count",getRegisteredUserCount); 
appointmentRouter.put("/:id", updateAppointment);
appointmentRouter.delete("/:id", clerkMiddleware(), requireAuth(), adminAuth, deleteAppointment);


export default appointmentRouter;
