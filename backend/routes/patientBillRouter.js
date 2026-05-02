import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  createAdminBill,
  createStaffBill,
  deleteAdminBill,
  deleteStaffBill,
  getAdminBillById,
  getAdminBills,
  getMyBillById,
  getMyBills,
  getStaffBillById,
  getStaffBills,
  updateAdminBill,
  updateAdminBillInsurance,
  updateAdminBillPayment,
  updateStaffBill,
  updateStaffBillInsurance,
  updateStaffBillPayment,
} from "../controllers/patientBillController.js";
import adminAuth from "../middlewares/adminAuth.js";
import staffAuth from "../middlewares/staffAuth.js";

const patientBillRouter = express.Router();

patientBillRouter.get("/my", clerkMiddleware(), getMyBills);
patientBillRouter.get("/my/:id", clerkMiddleware(), getMyBillById);

patientBillRouter.post("/staff", staffAuth, createStaffBill);
patientBillRouter.get("/staff", staffAuth, getStaffBills);
patientBillRouter.get("/staff/:id", staffAuth, getStaffBillById);
patientBillRouter.put("/staff/:id/payment", staffAuth, updateStaffBillPayment);
patientBillRouter.put("/staff/:id/insurance", staffAuth, updateStaffBillInsurance);
patientBillRouter.put("/staff/:id", staffAuth, updateStaffBill);
patientBillRouter.delete("/staff/:id", staffAuth, deleteStaffBill);

patientBillRouter.post("/", clerkMiddleware(), requireAuth(), adminAuth, createAdminBill);
patientBillRouter.get("/", clerkMiddleware(), requireAuth(), adminAuth, getAdminBills);
patientBillRouter.get("/:id", clerkMiddleware(), requireAuth(), adminAuth, getAdminBillById);
patientBillRouter.put("/:id/payment", clerkMiddleware(), requireAuth(), adminAuth, updateAdminBillPayment);
patientBillRouter.put("/:id/insurance", clerkMiddleware(), requireAuth(), adminAuth, updateAdminBillInsurance);
patientBillRouter.put("/:id", clerkMiddleware(), requireAuth(), adminAuth, updateAdminBill);
patientBillRouter.delete("/:id", clerkMiddleware(), requireAuth(), adminAuth, deleteAdminBill);

export default patientBillRouter;
