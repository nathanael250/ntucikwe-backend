const fs = require("fs");
const path = require("path");
const multer = require("multer");
const HttpError = require("../utils/httpError");
const { dealsUploadsRoot, adsUploadsRoot } = require("../config/paths");

fs.mkdirSync(dealsUploadsRoot, { recursive: true });
fs.mkdirSync(adsUploadsRoot, { recursive: true });

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    cb(new HttpError(400, "Only image uploads are allowed"));
    return;
  }

  cb(null, true);
};

const createUploader = (destinationDir) =>
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, destinationDir);
      },
      filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        const safeBaseName = path
          .basename(file.originalname || "image", extension)
          .replace(/[^a-zA-Z0-9_-]/g, "-")
          .toLowerCase();

        cb(null, `${Date.now()}-${safeBaseName}${extension}`);
      }
    }),
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  });

module.exports = {
  dealsUpload: createUploader(dealsUploadsRoot),
  adsUpload: createUploader(adsUploadsRoot)
};
