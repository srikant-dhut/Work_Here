const {
  validateAccessToken,
  refreshAccessToken,
} = require("../helper/tokenGenerate");

const checkAuthentication = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
      req.isAuthenticated = false;
      res.locals.isAuthenticated = false;
      res.locals.user = null;
      return next();
    }

    let user = await validateAccessToken(
      process.env.ACCESS_TOKEN_SECRET,
      accessToken
    );

    if (!user && refreshToken) {
      //Access token expired or invalid → try to refresh it
      try {
        const data = await refreshAccessToken(refreshToken);
        res.cookie("accessToken", data.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        });

        user = data.user;
      } catch (refreshError) {
        console.log("Refresh failed:", refreshError.message);
        req.isAuthenticated = false;
        return next();
      }
    }

    if (user) {
      req.user = user;
      req.isAuthenticated = true;
      res.locals.user = user;
      res.locals.isAuthenticated = true;
    } else {
      req.isAuthenticated = false;
      res.locals.isAuthenticated = false;
      res.locals.user = null;
    }

    next();
  } catch (error) {
    console.log("Auth middleware error:", error);
    req.isAuthenticated = false;
    res.locals.isAuthenticated = false;
    res.locals.user = null;
    next();
  }
};

module.exports = checkAuthentication;
