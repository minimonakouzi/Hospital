import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  createBed,
  createRoom,
  createWard,
  deleteBed,
  deleteRoom,
  deleteWard,
  getWardById,
  getWardStats,
  getWards,
  updateBed,
  updateRoom,
  updateWard,
} from "../controllers/wardController.js";
import adminAuth from "../middlewares/adminAuth.js";
import serviceManageAuth from "../middlewares/serviceManageAuth.js";

const wardRouter = express.Router();
const protectAdmin = [clerkMiddleware(), requireAuth(), adminAuth];
const protectAdminOrStaff = [clerkMiddleware(), serviceManageAuth];

wardRouter.get("/stats/summary", protectAdminOrStaff, getWardStats);
wardRouter.get("/", protectAdminOrStaff, getWards);
wardRouter.post("/", protectAdmin, createWard);
wardRouter.get("/:id", protectAdminOrStaff, getWardById);
wardRouter.put("/:id", protectAdmin, updateWard);
wardRouter.delete("/:id", protectAdmin, deleteWard);

wardRouter.post("/:wardId/rooms", protectAdmin, createRoom);
wardRouter.put("/:wardId/rooms/:roomId", protectAdmin, updateRoom);
wardRouter.delete("/:wardId/rooms/:roomId", protectAdmin, deleteRoom);

wardRouter.post("/:wardId/rooms/:roomId/beds", protectAdmin, createBed);
wardRouter.put("/:wardId/rooms/:roomId/beds/:bedId", protectAdmin, updateBed);
wardRouter.delete("/:wardId/rooms/:roomId/beds/:bedId", protectAdmin, deleteBed);

export default wardRouter;
