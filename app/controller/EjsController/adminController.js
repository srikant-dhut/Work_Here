const RefreshToken = require("../../model/refreshTokenModel");
const { User } = require("../../model/userModel");
const { verifyPassword } = require("../../helper/passwordHash");
const jwt = require("jsonwebtoken");
const Job = require("../../model/JobModel");
const Bid = require("../../model/BidModel");
const Message = require("../../model/MessageModel");

class AdminEjsController {
  async dashboard(req, res) {
    try {
      // Get statistics for admin dashboard
      const totalUsers = await User.countDocuments();
      const totalJobs = await Job.countDocuments();
      const totalBids = await Bid.countDocuments();
      const totalMessages = await Message.countDocuments();

      // Get client statistics (excluding admin users)
      const totalClients = await User.countDocuments({ role: 'client' });
      const clients = await User.find({ role: 'client' })
        .select('name email phone country city createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

      // Get freelancer statistics (excluding admin users)
      const totalFreelancers = await User.countDocuments({ role: 'freelancer' });
      const freelancers = await User.find({ role: 'freelancer' })
        .select('name email phone skills experienceLevel hourlyRate country city createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

      // Get job statistics by status
      const jobStats = await Job.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      // Get user statistics by role (excluding admin from display)
      const userStats = await User.aggregate([
        {
          $match: { role: { $ne: 'admin' } }
        },
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 }
          }
        }
      ]);

      res.render("adminDashboard", {
        user: req.user || null,
        totalUsers,
        totalJobs,
        totalBids,
        totalMessages,
        totalClients,
        totalFreelancers,
        clients,
        freelancers,
        jobStats,
        userStats
      });
    } catch (error) {
      console.log(error);
      res.render("adminDashboard", {
        user: req.user || null,
        totalUsers: 0,
        totalJobs: 0,
        totalBids: 0,
        totalMessages: 0,
        totalClients: 0,
        totalFreelancers: 0,
        clients: [],
        freelancers: [],
        jobStats: [],
        userStats: []
      });
    }
  }

  async adminProfile(req, res) {
    try {
      const userId = req.user ? req.user.userId : null;
      const user = await User.findById(userId);
      res.render("adminProfile", { user });
    } catch (error) {
      console.log(error);
      res.redirect("/admin/dashboard");
    }
  }

  async adminEditForm(req, res) {
    try {
      const userId = req.user ? req.user.userId : null;
      const user = await User.findById(userId);
      const redirectTo = req.query.redirectTo || "/admin/dashboard";

      res.render("adminEditForm", { user, redirectTo });
    } catch (error) {
      console.log(error);
      res.redirect("/admin/dashboard");
    }
  }

  async adminEdit(req, res) {
    try {
      const id = req.params.id;
      console.log(id);
      const existingUser = await User.findById(id);
      if (!existingUser) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/dashboard");
      }

      const {
        name,
        email,
        phone,
        country,
        street,
        houseNumber,
        apartment,
        city,
        state,
        postcode,
        redirectTo,
      } = req.body;

      const updateData = await User.findByIdAndUpdate(
        id,
        {
          name,
          email,
          phone,
          country,
          street,
          houseNumber,
          apartment,
          city,
          state,
          postcode,
        },
        { new: true }
      );
      req.flash("success_msg", "User profile updated successfully");
      return res.redirect("/admin/adminProfile/");
    } catch (error) {
      console.log(error);
      req.flash("error_msg", "Failed to update user profile");
      res.redirect("/admin/dashboard");
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req?.body;
      if (!email || !password) {
        req.flash("error_msg", "All fields are required");
        return res.redirect("/admin/login");
      }

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/login");
      }

      // Check if user is admin
      if (existingUser.role !== 'admin') {
        req.flash("error_msg", "Access denied. Admin privileges required.");
        return res.redirect("/admin/login");
      }

      const isMatchingPassword = await verifyPassword(
        password,
        existingUser.password
      );
      if (!isMatchingPassword) {
        req.flash("error_msg", "Invalid credentials");
        return res.redirect("/admin/login");
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

      // Use separate cookie names for admin authentication
      res.cookie("adminAccessToken", accessToken, { httpOnly: true });
      res.cookie("adminRefreshToken", refreshToken, { httpOnly: true });

      req.flash("success_msg", "Login successful");
      res.redirect("/admin/dashboard");
    } catch (error) {
      console.log(error);
      req.flash("error_msg", "Login failed");
      res.redirect("/admin/login");
    }
  }

  async logout(req, res) {
    try {
      const refreshToken = req.cookies.adminRefreshToken;
      if (refreshToken) {
        await RefreshToken.deleteOne({ token: refreshToken });
      }
      res.clearCookie("adminAccessToken");
      res.clearCookie("adminRefreshToken");
      req.flash("success_msg", "Logout successful");
      res.redirect("/admin/login");
    } catch (error) {
      console.log(error);
      res.clearCookie("adminAccessToken");
      res.clearCookie("adminRefreshToken");
      res.redirect("/admin/login");
    }
  }

}

module.exports = new AdminEjsController();
