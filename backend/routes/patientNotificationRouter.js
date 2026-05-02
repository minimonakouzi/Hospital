import express from "express";
import { clerkMiddleware } from "@clerk/express";
import {
  getMyPatientNotifications,
  markAllPatientNotificationsRead,
  markPatientNotificationRead,
} from "../controllers/patientNotificationController.js";

const patientNotificationRouter = express.Router();

patientNotificationRouter.get(
  "/my",
  clerkMiddleware(),
  getMyPatientNotifications
);

patientNotificationRouter.put(
  "/read-all",
  clerkMiddleware(),
  markAllPatientNotificationsRead
);

patientNotificationRouter.put(
  "/:id/read",
  clerkMiddleware(),
  markPatientNotificationRead
);

export default patientNotificationRouter;
