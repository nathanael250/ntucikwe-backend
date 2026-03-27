const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const uploadsRoot = path.join(projectRoot, "uploads");
const dealsUploadsRoot = path.join(uploadsRoot, "deals");
const adsUploadsRoot = path.join(uploadsRoot, "ads");

module.exports = {
  projectRoot,
  uploadsRoot,
  dealsUploadsRoot,
  adsUploadsRoot
};
