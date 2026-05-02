import express from "express";
import { clerkMiddleware } from "@clerk/express";
import {
  assignSupportTicket,
  createSupportTicket,
  getMySupportTicketById,
  getMySupportTickets,
  getSupportTicketById,
  getSupportTickets,
  replyToMySupportTicket,
  replyToSupportTicket,
  updateSupportTicketPriority,
  updateSupportTicketStatus,
} from "../controllers/supportTicketController.js";
import staffAuth from "../middlewares/staffAuth.js";

const supportTicketRouter = express.Router();

supportTicketRouter.post("/", clerkMiddleware(), createSupportTicket);
supportTicketRouter.get("/my", clerkMiddleware(), getMySupportTickets);
supportTicketRouter.get("/my/:id", clerkMiddleware(), getMySupportTicketById);
supportTicketRouter.post("/my/:id/reply", clerkMiddleware(), replyToMySupportTicket);

supportTicketRouter.get("/", staffAuth, getSupportTickets);
supportTicketRouter.get("/:id", staffAuth, getSupportTicketById);
supportTicketRouter.post("/:id/reply", staffAuth, replyToSupportTicket);
supportTicketRouter.put("/:id/status", staffAuth, updateSupportTicketStatus);
supportTicketRouter.put("/:id/priority", staffAuth, updateSupportTicketPriority);
supportTicketRouter.put("/:id/assign", staffAuth, assignSupportTicket);

export default supportTicketRouter;
