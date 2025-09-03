const statusCode = require("../../helper/httpsStatusCode")
const { hashGenerate, verifyPassword } = require("../../helper/passwordHash")
const RefreshToken = require("../../model/refreshTokenModel")
const jwt = require("jsonwebtoken");
const { User, userSchemaValidation } = require("../../model/userModel")
const sendEmailVerificationOTP = require("../../helper/smsValidation")
const EmailVerifyModel = require("../../model/otpModel")
const { equal } = require("joi")
const { default: mongoose } = require("mongoose");
const Job = require("../../model/JobModel")
const Bid = require("../../model/BidModel")
const fs = require("fs");
const path = require("path");


class UserEjsController {
  async signupPage(req, res) {
    try {
      res.render("signup");
    } catch (error) {
      console.log(error);
    }
  }

  async register(req, res) {
    try {
      const data = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        role: req.body.role,
      };
      const { error, value } = userSchemaValidation.validate(data);
      if (error) {
        req.flash("error_msg", error.details[0].message);
        return res.redirect("/signup");
      } else {
        const { name, email, phone, password, role } = req?.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          req.flash("error_msg", "User Already Exist");
          return res.redirect("/signin");
        }
        const hashPassword = hashGenerate(password);
        const user = new User({
          name,
          email,
          phone,
          password: hashPassword,
          role,
        });
        const userData = await user.save();

        sendEmailVerificationOTP(req, user);

        req.flash(
          "success_msg",
          "Registration successfully done. Now verify your email with otp.Please check your email"
        );
        return res.redirect("/verifyOtp");
      }
    } catch (error) {
      req.flash("error_msg", "Registration Failed");
      res.redirect("/signup");
    }
  }

  async otpPage(req, res) {
    try {
      res.render("otpPage");
    } catch (error) {
      console.log(error);
    }
  }

  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        req.flash("error_msg", "All fields are required");
        return res.redirect("/verifyOtp");
      }
      const existingUser = await User.findOne({ email });

      if (!existingUser) {
        req.flash("error_msg", "Email doesn't exists");
        return res.redirect("/verifyOtp");
      }

      if (existingUser.is_verified) {
        req.flash("error_msg", "Email is already verified");
        return res.redirect("/signin");
      }

      const emailVerification = await EmailVerifyModel.findOne({
        userId: existingUser._id,
        otp,
      });
      if (!emailVerification) {
        if (!existingUser.is_verified) {
          await sendEmailVerificationOTP(req, existingUser);
          req.flash("error_msg", "Invalid OTP, new OTP sent to your email");
          return res.redirect("/verifyOtp");
        }
        req.flash("error_msg", "Invalid OTP, new OTP sent to your email");
        return res.redirect("/verifyOtp");
      }

      const currentTime = new Date();

      const expirationTime = new Date(
        emailVerification.createdAt.getTime() + 15 * 60 * 1000
      );
      if (currentTime > expirationTime) {
        await sendEmailVerificationOTP(req, existingUser);
        req.flash("error_msg", "Invalid OTP, new OTP sent to your email");
        return res.redirect("/verifyOtp");
      }

      existingUser.is_verified = true;
      await existingUser.save();

      await EmailVerifyModel.deleteMany({ userId: existingUser._id });
      req.flash("success_msg", "Email verified successfully");
      return res.redirect("/signin");
    } catch (error) {
      console.error(error);
      res.status(statusCode.internalServerError).json({
        status: false,
        message: "Unable to verify email, please try again later",
      });
    }
  }

  async signinPage(req, res) {
    try {
      res.render("signin");
    } catch (error) {
      console.log(error);
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req?.body;
      if (!email || !password) {
        req.flash("error_msg", "All fields are reuired");
        return res.redirect("/signin");
      }
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        req.flash("error_msg", "User not found");
        return res.redirect("/signin");
      }
      if (!existingUser.is_verified) {
        await sendEmailVerificationOTP(req, existingUser);
        req.flash("error_msg", "User not verified");
        return res.redirect("/verifyOtp");
      }
      const isMatchingPassword = await verifyPassword(
        password,
        existingUser.password
      );
      if (!isMatchingPassword) {
        req.flash("error_msg", "Invalid credentials");
        return res.redirect("/signin");
      }

      const accessToken = jwt.sign(
        {
          userId: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "14m" }
      );
      const refreshToken = jwt.sign(
        {
          userId: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      const userToken = await RefreshToken.findOne({ user: existingUser._id });
      if (userToken) {
        await RefreshToken.deleteOne({ user: existingUser._id });
      }
      await RefreshToken.create({
        token: refreshToken,
        user: existingUser._id,
      });

      res.cookie("accessToken", accessToken, { httpOnly: true });
      res.cookie("refreshToken", refreshToken, { httpOnly: true });

      req.flash("success_msg", "Login successful");

      if (existingUser.role === 'admin') {
        res.redirect("/admin/dashboard");
      } else if (existingUser.role === 'freelancer') {
        res.redirect("/freelancer/dashboard");
      } else {
        res.redirect("/clientPage");
      }
    } catch (error) {
      console.log(error);
    }
  }

  async forgotPasswordEmailForm(req, res) {
    try {
      res.render("forgotWithEmail");
    } catch (error) {
      console.log(error);
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        req.flash("error_msg", "Email is required");
        return res.redirect("/forgot-password");
      }
      const user = await User.findOne({ email });
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/forgot-password");
      }
      sendEmailVerificationOTP(req, user);
      res.redirect("/reset-password");
    } catch (error) {
      console.log(error);
    }
  }

  async confirmPasswordForm(req, res) {
    try {
      res.render("resetPassword");
    } catch (error) {
      console.log(error);
    }
  }

  async confirmPassword(req, res) {
    try {
      const { email, otp, newPassword, confirmPassword } = req.body;
      if (!email || !otp || !newPassword || !confirmPassword) {
        req.flash("error_msg", "All fields are required");
        return res.redirect("/reset-password");
      }
      const user = await User.findOne({ email });
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/reset-password");
      }
      if (confirmPassword !== newPassword) {
        req.flash(
          "error_msg",
          "New Password and confirm Password does not match"
        );
        return res.redirect("/forgot-password");
      }
      const otpverify = await EmailVerifyModel.findOne({
        userId: user._id,
        otp,
      });
      if (!otpverify) {
        await sendEmailVerificationOTP(req, user);
        req.flash("error_msg", "Invalid Otp");
        return res.redirect("/forgot-password");
      }
      const currentTime = new Date();
      const expirationTime = new Date(
        otpverify.createdAt.getTime() + 15 * 60 * 1000
      );
      if (currentTime > expirationTime) {
        await sendEmailVerificationOTP(req, user);
        req.flash("error_msg", "Otp expired, new otp sent to your email");
        return res.redirect("/forgot-password");
      }
      await EmailVerifyModel.deleteMany({ userId: user._id });
      const newHashPassword = hashGenerate(confirmPassword);
      await User.findByIdAndUpdate(user._id, {
        $set: { password: newHashPassword },
      });
      req.flash("success_msg", "Password updated successful");
      res.redirect("/signin");
    } catch (error) {
      console.log(error);
    }
  }

  async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      await RefreshToken.deleteOne({ token: refreshToken });
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      req.flash("success_msg", "Logout successfull");
      res.redirect("/");
    } catch (error) {
      console.log(error);
    }
  }

  async clientProfile(req, res) {
    try {
      const userId = req.user ? req.user.userId : null;
      const user = await User.findById(userId);
      res.render("clientProfile", { user });
    } catch (error) {
      console.log(error);
      return res.redirect("/");
    }
  }

  async clientProfileEditForm(req, res) {
    try {
      const userId = req.user ? req.user.userId : null;

      if (!userId) {
        req.flash("error_msg", "Please sign in to edit your profile");
        return res.redirect("/signin");
      }

      const user = await User.findById(userId);
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/clientProfile/");
      }

      const redirectTo = req.query.redirectTo || "/clientProfile/";

      res.render("clientProfileEditForm", {
        user,
        redirectTo,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Error loading edit form:", error);
      req.flash("error_msg", "An error occurred while loading the form");
      return res.redirect("/clientProfile/");
    }
  }

  async clientProfileEdit(req, res) {
    try {
      const userId = req.user ? req.user.userId : null;

      // Check if logged-in user exists
      if (!userId) {
        req.flash("error_msg", "You need to login to edit profile");
        return res.redirect("/signin");
      }

      const existingUser = await User.findById(userId);
      if (!existingUser) {
        req.flash("error_msg", "User not found");
        return res.redirect("/clientProfile");
      }

      const { name, email, phone, city, state, country } = req.body;

      // Basic validation
      if (!name || !email || !phone) {
        req.flash("error_msg", "Name, email, and phone are required");
        return res.redirect("/clientProfileEditForm");
      }

      // Check if email is already used by another user
      const emailTaken = await User.findOne({ email, _id: { $ne: userId } });
      if (emailTaken) {
        req.flash("error_msg", "This email is already in use");
        return res.redirect("/clientProfileEditForm");
      }

      // Handle profile picture upload
      let profilePic = existingUser.profilePic;
      if (req.file) {
        // Delete old image if exists
        const oldImagePath = path.join(__dirname, "..", "..", "public", existingUser.profilePic || "");
        if (existingUser.profilePic && fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
        profilePic = "/uploads/" + req.file.filename; // multer saves file here
      }

      // Update user
      await User.findByIdAndUpdate(
        userId,
        {
          name,
          email,
          phone,
          city: city || "",
          state: state || "",
          country: country || "",
          profilePic,
        },
        { new: true }
      );

      req.flash("success_msg", "Profile updated successfully");
      return res.redirect("/clientProfile");
    } catch (error) {
      console.error("Error updating profile:", error);
      req.flash("error_msg", "An error occurred while updating profile");
      return res.redirect("/clientProfileEditForm");
    }
  }

  async freelancerAccount(req, res) {
    try {
      const userId = req.user ? req.user.userId : null;
      const user = await User.findById(userId);
      res.render("freelancerAccount", { user });
    } catch (error) {
      console.log(error);
      return res.redirect("/");
    }
  }

  async freelancerAccountEditForm(req, res) {
    try {
      const userId = req.user ? req.user.userId : null;

      if (!userId) {
        req.flash("error_msg", "Please sign in to edit your profile");
        return res.redirect("/signin");
      }

      const user = await User.findById(userId);
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/freelancerAccount/");
      }

      const redirectTo = req.query.redirectTo || "/freelancerAccount/";

      res.render("freelancerAccountEditForm", {
        user,
        redirectTo,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Error loading edit form:", error);
      req.flash("error_msg", "An error occurred while loading the form");
      return res.redirect("/freelancerAccount/");
    }
  }

  async freelancerAccountEdit(req, res) {
    try {
      const userId = req.user ? req.user.userId : null;

      // Check if logged-in user exists
      if (!userId) {
        req.flash("error_msg", "You need to login to edit profile");
        return res.redirect("/signin");
      }

      const existingUser = await User.findById(userId);
      if (!existingUser) {
        req.flash("error_msg", "User not found");
        return res.redirect("/freelancerAccount");
      }

      const { name, email, phone, city, state, country } = req.body;

      // Basic validation
      if (!name || !email || !phone) {
        req.flash("error_msg", "Name, email, and phone are required");
        return res.redirect("/freelancerAccountEditForm");
      }

      // Check if email is already used by another user
      const emailTaken = await User.findOne({ email, _id: { $ne: userId } });
      if (emailTaken) {
        req.flash("error_msg", "This email is already in use");
        return res.redirect("/freelancerAccountEditForm");
      }

      // Handle profile picture upload
      let profilePic = existingUser.profilePic;
      if (req.file) {
        // Delete old image if exists
        const oldImagePath = path.join(__dirname, "..", "..", "public", existingUser.profilePic || "");
        if (existingUser.profilePic && fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
        profilePic = "/uploads/" + req.file.filename; // multer saves file here
      }

      // Update user
      await User.findByIdAndUpdate(
        userId,
        {
          name,
          email,
          phone,
          city: city || "",
          state: state || "",
          country: country || "",
          profilePic,
        },
        { new: true }
      );

      req.flash("success_msg", "Profile updated successfully");
      return res.redirect("/freelancerAccount");
    } catch (error) {
      console.error("Error updating profile:", error);
      req.flash("error_msg", "An error occurred while updating profile");
      return res.redirect("/freelancerAccountEditForm");
    }
  }

}

module.exports = new UserEjsController();
