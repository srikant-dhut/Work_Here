const { User } = require("../../model/userModel");
const Job = require("../../model/JobModel");

class HomeController {
  async homePage(req, res) {
    try {
      const openJobs = await Job.aggregate([
        { $match: { status: "open" } },
        {
          $project: {
            title: 1,
            description: 1,
            skills: 1,
            budget: 1,
            deadline: 1,
            status: 1,
            isUrgent: 1,
            experienceLevel: 1,
            totalBids: 1,
            createdAt: 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 8 }
      ]);

      const freelancers = await User.aggregate([
        { $match: { role: "freelancer" } },
        {
          $project: {
            name: 1,
            skills: 1,
            profilePic: 1,
            hourlyRate: 1
          }
        },
        { $limit: 4 }
      ]);

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

  async allJobsPage(req, res) {
    try {
      const openJobs = await Job.aggregate([
        { $match: { status: "open" } },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client"
          }
        },
        {
          $unwind: "$client"
        },
        {
          $project: {
            title: 1,
            description: 1,
            skills: 1,
            budget: 1,
            deadline: 1,
            status: 1,
            isUrgent: 1,
            experienceLevel: 1,
            totalBids: 1,
            createdAt: 1,
            "client.name": 1,
            "client.profilePic": 1
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      res.render("allJobs", {
        openJobs
      });
    } catch (error) {
      console.error(error);
      res.render("allJobs", {
        openJobs: []
      });
    }
  }

  async allFreelancersPage(req, res) {
    try {
      const freelancers = await User.aggregate([
        { $match: { role: "freelancer" } },
        {
          $project: {
            name: 1,
            skills: 1,
            profilePic: 1,
            hourlyRate: 1,
            bio: 1,
            experienceLevel: 1,
            location: 1,
            createdAt: 1
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      res.render("allFreelancers", {
        freelancers
      });
    } catch (error) {
      console.error(error);
      res.render("allFreelancers", {
        freelancers: []
      });
    }
  }

  async blogPage(req, res) {
    try {
      res.render("blog", {
      });
    } catch (error) {
      console.error(error);
      res.render("blog", {
      });
    }
  }
}

module.exports = new HomeController();


