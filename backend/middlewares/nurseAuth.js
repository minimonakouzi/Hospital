import jwt from "jsonwebtoken";
import Nurse from "../models/Nurse.js";

export default async function nurseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Nurse authentication required.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured.",
      });
    }

    const payload = jwt.verify(token, secret);
    if (payload?.role !== "nurse" || !payload?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid nurse token.",
      });
    }

    const nurse = await Nurse.findById(payload.id);
    if (!nurse) {
      return res.status(401).json({
        success: false,
        message: "Nurse account not found.",
      });
    }

    req.nurse = nurse;
    next();
  } catch (err) {
    console.error("Nurse authentication failed:", err);
    return res.status(401).json({
      success: false,
      message: "Nurse authentication failed.",
    });
  }
}
