const express = require("express");
const router = express.Router();
const UserApiController = require("../../controller/ApiController/userController");
const userCheckauthenticationToken = require("../../middlewere/auth");


router.post("/register", UserApiController.register);
router.post("/verify-otp", UserApiController.verifyOtp);
router.post("/login", UserApiController.login);
router.post("/forgot-password", UserApiController.forgotPassword);
router.post("/reset-password", UserApiController.resetPassword);

router.post("/logout", userCheckauthenticationToken, UserApiController.logout);
router.get("/profile", userCheckauthenticationToken, UserApiController.userProfile);
router.put("/profile", userCheckauthenticationToken, UserApiController.updateProfile);

module.exports = router;


