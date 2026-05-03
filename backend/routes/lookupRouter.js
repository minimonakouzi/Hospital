import { clerkMiddleware } from "@clerk/express";
import express from "express";
import { getLookupData } from "../controllers/lookupController.js";
import serviceManageAuth from "../middlewares/serviceManageAuth.js";

const lookupRouter = express.Router();

lookupRouter.get("/:type", clerkMiddleware(), serviceManageAuth, getLookupData);

export default lookupRouter;
