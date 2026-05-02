// routes/doctorRouter.js
import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import rateLimit from "express-rate-limit";
import multer from "multer";

import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  toggleAvailability,
  doctorLogin,
  changeDoctorPassword,
} from "../controllers/doctorController.js";

import doctorAuth from "../middlewares/doctorAuth.js";
import adminAuth from "../middlewares/adminAuth.js";

const upload = multer({ dest: "/tmp" });

const doctorRouter = express.Router();

const doctorLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});



doctorRouter.get("/", getDoctors);
doctorRouter.post("/login", doctorLoginLimiter, doctorLogin);
doctorRouter.put("/me/password", doctorAuth, changeDoctorPassword);
doctorRouter.get("/:id", getDoctorById);
doctorRouter.post("/", clerkMiddleware(), requireAuth(), adminAuth, upload.single("image"), createDoctor);
doctorRouter.put(
  "/:id",
  doctorAuth,
  upload.single("image"),
  updateDoctor
);
doctorRouter.post(
  "/:id/toggle-availability",
  doctorAuth,
  toggleAvailability
);
doctorRouter.delete("/:id", clerkMiddleware(), requireAuth(), adminAuth, deleteDoctor);

export default doctorRouter;
