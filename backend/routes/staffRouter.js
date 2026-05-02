import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  changeStaffPassword,
  createStaff,
  getStaff,
  getStaffById,
  getStaffMe,
  staffLogin,
  updateStaff,
  updateStaffMe,
  updateStaffStatus,
} from "../controllers/staffController.js";
import adminAuth from "../middlewares/adminAuth.js";
import staffAuth from "../middlewares/staffAuth.js";

const staffRouter = express.Router();

staffRouter.post("/login", staffLogin);
staffRouter.get("/me", staffAuth, getStaffMe);
staffRouter.put("/me", staffAuth, updateStaffMe);
staffRouter.put("/me/password", staffAuth, changeStaffPassword);

staffRouter.post("/", clerkMiddleware(), requireAuth(), adminAuth, createStaff);
staffRouter.get("/", clerkMiddleware(), requireAuth(), adminAuth, getStaff);
staffRouter.patch("/:id/status", clerkMiddleware(), requireAuth(), adminAuth, updateStaffStatus);
staffRouter.get("/:id", clerkMiddleware(), requireAuth(), adminAuth, getStaffById);
staffRouter.put("/:id", clerkMiddleware(), requireAuth(), adminAuth, updateStaff);

export default staffRouter;
