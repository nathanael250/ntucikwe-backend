const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const uploadsRoot = path.join(projectRoot, "uploads");
const dealsUploadsRoot = path.join(uploadsRoot, "deals");
const adsUploadsRoot = path.join(uploadsRoot, "ads");
const storesUploadsRoot = path.join(uploadsRoot, "stores");
const vendorDocumentsUploadsRoot = path.join(uploadsRoot, "vendor-documents");
const qrCodesUploadsRoot = path.join(uploadsRoot, "qrcodes");

module.exports = {
  projectRoot,
  uploadsRoot,
  dealsUploadsRoot,
  adsUploadsRoot,
  storesUploadsRoot,
  vendorDocumentsUploadsRoot,
  qrCodesUploadsRoot
};
