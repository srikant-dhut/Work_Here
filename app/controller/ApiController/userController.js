const statusCode = require("../../helper/httpsStatusCode");
const { hashGenerate, verifyPassword } = require("../../helper/passwordHash");
const RefreshToken = require("../../model/refreshTokenModel");
const jwt = require("jsonwebtoken");
const { User, userSchemaValidation } = require("../../model/userModel");
const sendEmailVerificationOTP = require("../../helper/smsValidation");
const EmailVerifyModel = require("../../model/otpModel");
const { default: mongoose } = require("mongoose");
const Job = require("../../model/JobModel");
const Bid = require("../../model/BidModel");
const fs = require("fs");
const path = require("path");

class UserApiController {
  // ✅ Register (Signup)
  async register(req, res) {
    try {
      const data = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        role: req.body.role,
      };

      const { error } = userSchemaValidation.validate(data);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }

      const { name, email, phone, password, role } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashPassword = hashGenerate(password);
      const user = new User({
        name,
        email,
        phone,
        password: hashPassword,
        role,
      });
      await user.save();

      sendEmailVerificationOTP(req, user);

      return res.status(201).json({
        message: "Registration successful. Please verify your email with OTP",
        userId: user._id,
        email: user.email,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Registration failed" });
    }
  }

  // ✅ Verify OTP
  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (existingUser.is_verified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      const emailVerification = await EmailVerifyModel.findOne({
        userId: existingUser._id,
        otp,
      });
      if (!emailVerification) {
        await sendEmailVerificationOTP(req, existingUser);
        return res
          .status(400)
          .json({ message: "Invalid OTP, new OTP sent to your email" });
      }

      const expirationTime =
        emailVerification.createdAt.getTime() + 15 * 60 * 1000;
      if (new Date() > expirationTime) {
        await sendEmailVerificationOTP(req, existingUser);
        return res
          .status(400)
          .json({ message: "OTP expired, new OTP sent to your email" });
      }

      existingUser.is_verified = true;
      await existingUser.save();

      await EmailVerifyModel.deleteMany({ userId: existingUser._id });

      return res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Unable to verify OTP" });
    }
  }

  // ✅ Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!existingUser.is_verified) {
        await sendEmailVerificationOTP(req, existingUser);
        return res.status(400).json({ message: "User not verified, OTP resent" });
      }

      const isMatchingPassword = await verifyPassword(
        password,
        existingUser.password
      );
      if (!isMatchingPassword) {
        return res.status(400).json({ message: "Invalid credentials" });
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

      await RefreshToken.deleteMany({ user: existingUser._id });
      await RefreshToken.create({ token: refreshToken, user: existingUser._id });

      return res.status(200).json({
        message: "Login successful",
        accessToken,
        refreshToken,
        role: existingUser.role,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Login failed" });
    }
  }

  // ✅ Logout
  async logout(req, res) {
    try {
      const refreshToken = req.body.refreshToken;
      await RefreshToken.deleteOne({ token: refreshToken });
      return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Logout failed" });
    }
  }

  // ✅ Forgot Password (Send OTP)
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await sendEmailVerificationOTP(req, user);
      return res.status(200).json({ message: "OTP sent to your email" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to send OTP" });
    }
  }

  // ✅ Reset Password
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const otpverify = await EmailVerifyModel.findOne({
        userId: user._id,
        otp,
      });
      if (!otpverify) {
        await sendEmailVerificationOTP(req, user);
        return res.status(400).json({ message: "Invalid OTP" });
      }

      const expirationTime = otpverify.createdAt.getTime() + 15 * 60 * 1000;
      if (new Date() > expirationTime) {
        await sendEmailVerificationOTP(req, user);
        return res
          .status(400)
          .json({ message: "OTP expired, new OTP sent to your email" });
      }

      await EmailVerifyModel.deleteMany({ userId: user._id });
      const newHashPassword = hashGenerate(newPassword);
      await User.findByIdAndUpdate(user._id, { $set: { password: newHashPassword } });

      return res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  }

  // ✅ Get User Profile
  async userProfile(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await User.findById(userId).lean();

      let jobs = [];
      let bids = [];

      if (user.role === "client") {
        jobs = await Job.find({ client: userId }).sort({ createdAt: -1 }).limit(10).lean();
      } else if (user.role === "freelancer") {
        bids = await Bid.aggregate([
          { $match: { freelancer: new mongoose.Types.ObjectId(userId) } },
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "jobs",
              localField: "job",
              foreignField: "_id",
              as: "job",
            },
          },
          { $unwind: "$job" },
        ]);
      }

      return res.status(200).json({ user, jobs, bids });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to load profile" });
    }
  }

  // ✅ Update User Profile
  async updateProfile(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { name, email, phone, city, state, country } = req.body;
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Email check
      const emailTaken = await User.findOne({ email, _id: { $ne: userId } });
      if (emailTaken) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Handle profile picture
      let profilePic = existingUser.profilePic;
      if (req.file) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          "..",
          "public",
          existingUser.profilePic || ""
        );
        if (existingUser.profilePic && fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
        profilePic = "/uploads/" + req.file.filename;
      }

      await User.findByIdAndUpdate(
        userId,
        { name, email, phone, city, state, country, profilePic },
        { new: true }
      );

      return res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to update profile" });
    }
  }
}

module.exports = new UserApiController();
