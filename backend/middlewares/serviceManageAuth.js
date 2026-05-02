import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/clerk-sdk-node";
import jwt from "jsonwebtoken";
import Staff from "../models/Staff.js";

export default async function serviceManageAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Service management authentication required.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (secret) {
      try {
        const payload = jwt.verify(token, secret);
        if (payload?.role === "staff" && payload?.id) {
          const staff = await Staff.findById(payload.id);
          if (!staff) {
            return res.status(401).json({
              success: false,
              message: "Staff account not found.",
            });
          }
          if (staff.status === "Inactive") {
            return res.status(403).json({
              success: false,
              message: "This staff account is inactive.",
            });
          }
          req.staff = staff;
          return next();
        }
      } catch {
        // Not a staff JWT. Fall through and try Clerk admin auth.
      }
    }

    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Admin or staff authentication required.",
      });
    }

    const user = await clerkClient.users.getUser(userId);
    if (user?.publicMetadata?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin or staff access required.",
      });
    }

    req.admin = { userId, user };
    return next();
  } catch (err) {
    console.error("Service management authorization failed:", err);
    return res.status(401).json({
      success: false,
      message: "Service management authentication failed.",
    });
  }
}
