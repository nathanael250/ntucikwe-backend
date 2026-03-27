const fs = require("fs");
const path = require("path");
const multer = require("multer");
const HttpError = require("../utils/httpError");
const { dealsUploadsRoot } = require("../config/paths");

fs.mkdirSync(dealsUploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, dealsUploadsRoot);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeBaseName = path
      .basename(file.originalname || "image", extension)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .toLowerCase();

    cb(null, `${Date.now()}-${safeBaseName}${extension}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    cb(new HttpError(400, "Only image uploads are allowed"));
    return;
  }

  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
