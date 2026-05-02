// routes/services.js
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import multer from "multer";
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";
import serviceManageAuth from "../middlewares/serviceManageAuth.js";
import requireStaffServiceAuth from "../middlewares/requireStaffServiceAuth.js";

const upload = multer({ dest: "/tmp" }); // same as your existing setup (or change to suit)

const serviceRouter = express.Router();

// Public routes
serviceRouter.get("/", getServices);
serviceRouter.get("/:id", getServiceById);

// Create service (staff only; multipart form; image field name is "image")
serviceRouter.post("/", clerkMiddleware(), requireStaffServiceAuth, upload.single("image"), createService);

// Update service (multipart form; image field name is "image")
serviceRouter.put("/:id", clerkMiddleware(), serviceManageAuth, upload.single("image"), updateService);

// Delete
serviceRouter.delete("/:id", clerkMiddleware(), serviceManageAuth, deleteService);

export default serviceRouter;
