import AuditLog from "../models/AuditLog.js";

export async function getAuditLogs(req, res) {
  try {
    const {
      role = "",
      action = "",
      page: pageRaw = 1,
      limit: limitRaw = 100,
    } = req.query;
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 100));
    const skip = (page - 1) * limit;

    const filter = {};
    if (role) filter.actorRole = role;
    if (action) filter.action = action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      message: "Audit logs loaded successfully.",
      data: logs,
      meta: { page, limit, total, count: logs.length },
    });
  } catch (err) {
    console.error("getAuditLogs error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while loading audit logs.",
    });
  }
}
