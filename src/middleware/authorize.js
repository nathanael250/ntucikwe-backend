const HttpError = require("../utils/httpError");
const { hasPermission } = require("../config/permissions");

module.exports = (command) => (req, _res, next) => {
  if (!req.user) {
    return next(new HttpError(401, "Authentication required"));
  }

  if (!hasPermission(req.user.role, command)) {
    return next(new HttpError(403, "You do not have permission for this action"));
  }

  next();
};
