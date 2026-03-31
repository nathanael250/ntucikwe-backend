const User = require("../models/User");
const { verifyToken } = require("../utils/tokenUtils");

module.exports = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    const user = await User.getSafeUserById(payload.userId);

    if (user) {
      req.user = user;
    }

    return next();
  } catch (_error) {
    return next();
  }
};
