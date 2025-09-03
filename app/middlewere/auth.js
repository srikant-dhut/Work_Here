const jwt = require("jsonwebtoken");
const {
  validateAccessToken,
  validateRefreshToken,
  generateAccessToken,
} = require("../helper/tokenGenerate");

const userCheckauthenticationToken = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    //Fallback to cookies if no header
    if (!token && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    //Extract refresh token also from headers (NEW)
    let refreshToken = req.headers["x-refresh-token"];
    if (!refreshToken && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    //Validate access token
    const user = await validateAccessToken(process.env.ACCESS_TOKEN_SECRET, token);
    if (user) {
      req.user = user;
      return next();
    }

    //If access token invalid, fallback to refresh token
    if (refreshToken) {
      const user = await validateRefreshToken(
        process.env.REFRESH_TOKEN_SECRET,
        refreshToken
      );
      if (user) {
        const newAccessToken = generateAccessToken(
          user,
          process.env.ACCESS_TOKEN_SECRET
        );
        res.cookie("accessToken", newAccessToken, { httpOnly: true });
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = userCheckauthenticationToken;
