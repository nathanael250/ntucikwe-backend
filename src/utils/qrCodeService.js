const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { qrCodesUploadsRoot } = require("../config/paths");

fs.mkdirSync(qrCodesUploadsRoot, { recursive: true });

const buildPublicUrl = (relativePath) => {
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, "")}${relativePath}`;
};

const ensureQrCodeImage = async ({ qr_token, qr_value }) => {
  const safeToken = String(qr_token).trim();
  const fileName = `${safeToken}.png`;
  const absolutePath = path.join(qrCodesUploadsRoot, fileName);
  const relativePath = `/uploads/qrcodes/${fileName}`;

  if (!fs.existsSync(absolutePath)) {
    await QRCode.toFile(absolutePath, qr_value, {
      type: "png",
      width: 360,
      margin: 2
    });
  }

  return {
    file_name: fileName,
    absolute_path: absolutePath,
    relative_path: relativePath,
    public_url: buildPublicUrl(relativePath)
  };
};

module.exports = {
  ensureQrCodeImage,
  buildPublicUrl
};
