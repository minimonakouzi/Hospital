import jwt from "jsonwebtoken";
import Staff from "../models/Staff.js";

export default async function staffAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Staff authentication required.",
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
    if (payload?.role !== "staff" || !payload?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff token.",
      });
    }

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
    next();
  } catch (err) {
    console.error("Staff authentication failed:", err);
    return res.status(401).json({
      success: false,
      message: "Staff authentication failed.",
    });
  }
}
