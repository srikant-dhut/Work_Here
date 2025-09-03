const { User } = require("../../model/userModel");
const Job = require("../../model/JobModel");

class HomeController {
  async homePage(req, res) {
    try {
      const openJobs = await Job.find({ status: "open" })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Fetch freelancers with minimal details
      const freelancers = await User.find(
        { role: "freelancer" },
        "name skills profilePic hourlyRate"
      ).limit(12).lean();

      res.render("home", {
        isAuthenticated: req.isAuthenticated,
        user: req.user,
        openJobs,
        freelancers,
      });
    } catch (error) {
      console.error(error);
      res.render("home", {
        isAuthenticated: req.isAuthenticated,
        user: req.user,
        openJobs: [],
        freelancers: [],
      });
    }
  }
}

module.exports = new HomeController();
