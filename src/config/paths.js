const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const uploadsRoot = path.join(projectRoot, "uploads");
const dealsUploadsRoot = path.join(uploadsRoot, "deals");

module.exports = {
  projectRoot,
  uploadsRoot,
  dealsUploadsRoot
};
