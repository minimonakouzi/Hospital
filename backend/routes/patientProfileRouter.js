import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  getMyPatientProfile,
  upsertMyPatientProfile,
} from "../controllers/patientProfileController.js";

const patientProfileRouter = express.Router();

patientProfileRouter.get(
  "/me",
  clerkMiddleware(),
  requireAuth(),
  getMyPatientProfile
);

patientProfileRouter.put(
  "/me",
  clerkMiddleware(),
  requireAuth(),
  upsertMyPatientProfile
);

export default patientProfileRouter;