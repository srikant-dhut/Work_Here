const express = require("express");
const router = express.Router();
const userEjsController = require("../../controller/EjsController/userController");
const authenticationToken = require("../../middlewere/auth");
const checkAuthentication = require("../../middlewere/checkAuthentication");
const userCheckauthenticationToken = require("../../middlewere/auth");
const upload = require("../../middlewere/upload");

// Auth pages
router.get("/signin", userEjsController.signinPage);
router.get("/signup", userEjsController.signupPage);
router.post("/register", userEjsController.register);
router.get("/verifyOtp", userEjsController.otpPage);
router.post("/verifyOtp", userEjsController.verifyOtp);
router.post("/login", userEjsController.login);
router.get("/logout", userEjsController.logout);

// Password reset
router.get("/forgot-password", userEjsController.forgotPasswordEmailForm);
router.post("/forgot-password", userEjsController.forgotPassword);
router.get("/reset-password", userEjsController.confirmPasswordForm);
router.post("/reset-password", userEjsController.confirmPassword);

//Client Profile
router.get("/clientProfile", userCheckauthenticationToken, userEjsController.clientProfile);
router.get("/clientProfileEditForm", userCheckauthenticationToken, userEjsController.clientProfileEditForm);
router.post("/clientProfileEdit/:id", userCheckauthenticationToken, upload.single("profilePic"), userEjsController.clientProfileEdit);

//Freelancer Profile
router.get("/freelancerAccount", userCheckauthenticationToken, userEjsController.freelancerAccount);
router.get("/freelancerAccountEditForm", userCheckauthenticationToken, userEjsController.freelancerAccountEditForm);
router.post("/freelancerAccountEdit/:id", userCheckauthenticationToken, upload.single("profilePic"), userEjsController.freelancerAccountEdit);

module.exports = router;

