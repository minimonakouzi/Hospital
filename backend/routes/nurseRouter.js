import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  createNurse,
  changeNursePassword,
  getNurseCheckInQueue,
  getNurseDashboard,
  getNurseMe,
  getNurses,
  markNurseCheckIn,
  nurseLogin,
  updateNurseMe,
  updateNurseStatus,
} from "../controllers/nurseController.js";
import adminAuth from "../middlewares/adminAuth.js";
import nurseAuth from "../middlewares/nurseAuth.js";

const nurseRouter = express.Router();

nurseRouter.post("/login", nurseLogin);
nurseRouter.get("/dashboard", nurseAuth, getNurseDashboard);
nurseRouter.get("/check-ins", nurseAuth, getNurseCheckInQueue);
nurseRouter.put("/check-ins/:type/:id", nurseAuth, markNurseCheckIn);
nurseRouter.get("/me", nurseAuth, getNurseMe);
nurseRouter.put("/me", nurseAuth, updateNurseMe);
nurseRouter.put("/me/password", nurseAuth, changeNursePassword);
nurseRouter.get("/", clerkMiddleware(), requireAuth(), adminAuth, getNurses);
nurseRouter.post("/", clerkMiddleware(), requireAuth(), adminAuth, createNurse);
nurseRouter.patch("/:id/status", clerkMiddleware(), requireAuth(), adminAuth, updateNurseStatus);

export default nurseRouter;
