import fs from "fs";
import multer from "multer";
import path from "path";

const uploadDir = "uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const safeExt = path.extname(file.originalname || "").toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueName}${safeExt}`);
  },
});

const reportUpload = multer({
  storage,
  fileFilter(req, file, cb) {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only PDF and image report files are allowed."));
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export function uploadReportFile(req, res, next) {
  reportUpload.single("file")(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({
      success: false,
      message: err.message || "Unable to upload report file.",
    });
  });
}
