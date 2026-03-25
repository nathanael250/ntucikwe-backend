const User = require("../models/User");
const { verifyToken } = require("../utils/tokenUtils");
const HttpError = require("../utils/httpError");

module.exports = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Authentication required");
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    const user = await User.getSafeUserById(payload.userId);

    if (!user) {
      throw new HttpError(401, "Invalid token user");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new HttpError(401, "Invalid or expired token"));
  }
};
