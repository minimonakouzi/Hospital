import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/clerk-sdk-node";

export default async function adminAuth(req, res, next) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    const user = await clerkClient.users.getUser(userId);

    if (user?.publicMetadata?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.admin = { userId, user };
    next();
  } catch (err) {
    console.error("Admin authorization failed:", err);
    return res.status(401).json({
      success: false,
      message: "Admin authentication failed",
    });
  }
}
