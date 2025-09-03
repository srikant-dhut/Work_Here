const statusCode = require("../helper/httpsStatusCode");
const jwt = require("jsonwebtoken");
const {
  validateAccessToken,
  validateRefreshToken,
  generateAccessToken,
} = require("../helper/tokenGenerate");

const adminCheckauthenticationToken = async (req, res, next) => {
  try {
    const accessToken = req.cookies.adminAccessToken;
    const refreshToken = req.cookies.adminRefreshToken;

    if (accessToken) {
      const user = await validateAccessToken(
        process.env.ACCESS_TOKEN_SECRET,
        accessToken
      );
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Access token missing or invalid, fallback to refresh token
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

        // Set new access token in HTTP-only cookie with admin prefix
        res.cookie("adminAccessToken", newAccessToken, {
          httpOnly: true,
        });

        req.user = user;
        return next();
      }
    }
    res.clearCookie("adminAccessToken");
    res.clearCookie("adminRefreshToken");
    res.redirect("/admin/login");
  } catch (error) {
    res.clearCookie("adminAccessToken");
    res.clearCookie("adminRefreshToken");
    res.redirect("/admin/login");
  }
};

module.exports = adminCheckauthenticationToken;
