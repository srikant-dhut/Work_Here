const mongoose = require("mongoose");
const Job = require('../../model/JobModel');
const Bid = require('../../model/BidModel');
const Message = require('../../model/MessageModel');
const User = require('../../model/userModel').User;

class FreelancerController {
  async freelancerDashboard(req, res) {
    try {
      const userId = req.user.userId;
      //For pagination sra
      const page = parseInt(req.query.page) || 1;
      const limit = 4;                             
      const skip = (page - 1) * limit;             

      const availableJobs = await Job.aggregate([
        {
          $match: {
            status: "open",
            client: { $ne: new mongoose.Types.ObjectId(userId) },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            title: 1,
            description: 1,
            skills: 1,
            status: 1,
            budget: 1,
            deadline: 1,
            createdAt: 1,
            "client._id": 1,
            "client.name": 1,
            "client.email": 1,
          },
        },
      ]);
      const activeBids = await Bid.aggregate([
        {
          $match: {
            freelancer: new mongoose.Types.ObjectId(userId),
            status: { $in: ["pending", "accepted"] },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "jobs",
            localField: "job",
            foreignField: "_id",
            as: "job",
          },
        },
        { $unwind: "$job" },
        {
          $lookup: {
            from: "users",
            localField: "job.client",
            foreignField: "_id",
            as: "job.client",
          },
        },
        { $unwind: "$job.client" },
        {
          $project: {
            status: 1,
            createdAt: 1,
            "job._id": 1,
            "job.title": 1,
            "job.description": 1,
            "job.skills": 1,
            "job.status": 1,
            "job.budget": 1,
            "job.deadline": 1,
            "job.client._id": 1,
            "job.client.name": 1,
            "job.client.email": 1,
          },
        },
      ]);
      const acceptedJobs = await Job.aggregate([
        {
          $match: {
            acceptedFreelancer: new mongoose.Types.ObjectId(userId),
            status: { $in: ["in-progress", "completed"] },
          },
        },
        { $sort: { updatedAt: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            title: 1,
            description: 1,
            skills: 1,
            status: 1,
            budget: 1,
            deadline: 1,
            updatedAt: 1,
            "client._id": 1,
            "client.name": 1,
            "client.email": 1,
          },
        },
      ]);
      //Count total completed jobs
      const totalCompleted = await Job.countDocuments({ 
        acceptedFreelancer: new mongoose.Types.ObjectId(userId),
        status: "completed"
      });                                               
      // Fetch completed jobs
      const completedJobs = await Job.aggregate([
        {
          $match: {
            acceptedFreelancer: new mongoose.Types.ObjectId(userId),
            status: "completed",
          },
        },
        { $sort: { completedAt: -1 } }, 
        { $skip: skip },   
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "bids",
            localField: "_id",
            foreignField: "job",
            as: "acceptedBid",
          },
        },
        {
          $addFields: {
            acceptedBid: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$acceptedBid",
                    cond: { $eq: ["$$this.status", "accepted"] },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            title: 1,
            description: 1,
            skills: 1,
            status: 1,
            budget: 1,
            deadline: 1,
            updatedAt: 1,
            completedAt: 1,
            "client._id": 1,
            "client.name": 1,
            "client.email": 1,
            "acceptedBid.bidAmount": 1,
          },
        },
      ]);

      const totalPages = Math.ceil(totalCompleted / limit);
      const user = await User.findById(userId).lean();
      res.render("freelancerDashboard", {
        availableJobs,
        activeBids,
        acceptedJobs,
        completedJobs,
        user,
        isAuthenticated: true,
        currentPage: page,   
        totalPages          
      });
    } catch (error) {
      console.error("Error loading freelancer dashboard:", error);
      req.flash("error_msg", "Failed to load dashboard");
      res.redirect("/");
    }
  }

  async viewJobDetails(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;
      //Find job with client + acceptedFreelancer details using $lookup
      const jobs = await Job.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(jobId) }
        },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client"
          }
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "users",
            localField: "acceptedFreelancer",
            foreignField: "_id",
            as: "acceptedFreelancer"
          }
        },
        { $unwind: { path: "$acceptedFreelancer", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: 1,
            description: 1,
            skills: 1,
            status: 1,
            budget: 1,
            deadline: 1,
            experienceLevel: 1,
            createdAt: 1,
            updatedAt: 1,
            "client._id": 1,
            "client.name": 1,
            "client.email": 1,
            "acceptedFreelancer._id": 1,
            "acceptedFreelancer.name": 1,
            "acceptedFreelancer.email": 1
          }
        }
      ]);

      const job = jobs.length > 0 ? jobs[0] : null;
      if (!job) {
        req.flash("error_msg", "Job not found");
        return res.redirect("/freelancer/dashboard");
      }

      //Check if job is open for bidding
      if (job.status !== "open") {
        req.flash("error_msg", "This job is not accepting bids");
        return res.redirect("/freelancer/dashboard");
      }

      //Check if freelancer already bid on this job
      const existingBid = await Bid.findOne({
        job: jobId,
        freelancer: userId
      });

      //Check if freelancer is the client
      if (job.client._id.toString() === userId) {
        req.flash("error_msg", "You cannot bid on your own job");
        return res.redirect("/freelancer/dashboard");
      }

      const user = await User.findById(userId);
      res.render("jobDetails", {
        job,
        existingBid,
        user,
        isAuthenticated: true
      });

    } catch (error) {
      console.error("Error viewing job details:", error);
      req.flash("error_msg", "Failed to load job details");
      res.redirect("/freelancer/dashboard");
    }
  }

  async searchJobs(req, res) {
    try {
      const {
        keyword,
        minBudget,
        maxBudget,
        skills,
        experienceLevel,
        isUrgent
      } = req.query;

      const userId = req.user.userId;
      //Build filter
      const filter = {
        status: "open",
        client: { $ne: new mongoose.Types.ObjectId(userId) },//Exclude own jobs
      };

      if (keyword) {
        filter.$or = [
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ];
      }

      if (minBudget || maxBudget) {
        filter["budget.min"] = {};
        if (minBudget) filter["budget.min"].$gte = Number(minBudget);
        if (maxBudget) filter["budget.max"].$lte = Number(maxBudget);
      }

      if (skills) {
        const skillArray = skills.split(",").map((s) => s.trim());
        filter.skills = { $in: skillArray };
      }

      if (experienceLevel) {
        filter.experienceLevel = experienceLevel;
      }

      if (isUrgent === "true") {
        filter.isUrgent = true;
      }

      const jobs = await Job.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            title: 1,
            description: 1,
            skills: 1,
            status: 1,
            budget: 1,
            deadline: 1,
            experienceLevel: 1,
            isUrgent: 1,
            createdAt: 1,
            updatedAt: 1,
            "client._id": 1,
            "client.name": 1,
            "client.email": 1,
          },
        },
      ]);

      const user = await User.findById(userId).lean();
      res.render("jobSearch", {
        jobs,
        searchParams: req.query,
        user,
        isAuthenticated: true,
      });

    } catch (error) {
      console.error("Error searching jobs:", error);
      req.flash("error_msg", "Failed to search jobs");
      res.redirect("/freelancer/dashboard");
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      //Get freelancer user (basic info)
      const user = await User.findById(userId).lean();
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/freelancer/dashboard");
      }
      //Freelancer's bid statistics
      const bidStats = await Bid.aggregate([
        { $match: { freelancer: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);
      //Freelancer's completed jobs with client + acceptedBid details
      const completedJobs = await Job.aggregate([
        {
          $match: {
            acceptedFreelancer: new mongoose.Types.ObjectId(userId),
            status: "completed"
          }
        },
        //Lookup client details
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client"
          }
        },
        { $unwind: "$client" },
        //Lookup acceptedBid details
        {
          $lookup: {
            from: "bids",
            localField: "acceptedBid",
            foreignField: "_id",
            as: "acceptedBid"
          }
        },
        {
          $unwind: {
            path: "$acceptedBid",
            preserveNullAndEmptyArrays: true
          }
        },
        //Sort jobs by end date
        { $sort: { projectEndDate: -1 } }
      ]);
      //Calculate total earnings
      const totalEarnings = completedJobs.reduce((sum, job) => {
        return sum + (job.acceptedBid?.bidAmount || 0);
      }, 0);

      //Render profile page
      res.render("freelancerProfile", {
        user,
        bidStats,
        completedJobs,
        totalEarnings,
        isAuthenticated: true
      });
    } catch (error) {
      console.error("Error loading freelancer profile:", error);
      req.flash("error_msg", "Failed to load profile");
      res.redirect("/freelancer/dashboard");
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const {
        name,
        phone,
        skills,
        experienceLevel,
        hourlyRate,
        bio
      } = req.body;

      const updateData = {
        name,
        phone: Number(phone)
      };

      //Add skills and experience if provided
      if (skills) {
        updateData.skills = skills.split(',').map(s => s.trim());
      }

      if (experienceLevel) {
        updateData.experienceLevel = experienceLevel;
      }

      if (hourlyRate) {
        updateData.hourlyRate = Number(hourlyRate);
      }

      if (bio) {
        updateData.bio = bio;
      }

      await User.findByIdAndUpdate(userId, updateData, { new: true });

      req.flash('success_msg', 'Profile updated successfully');
      res.redirect('/freelancer/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      req.flash('error_msg', 'Failed to update profile');
      res.redirect('/freelancer/profile');
    }
  }

  async markJobReady(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;

      const job = await Job.findById(jobId);
      if (!job) {
        req.flash('error_msg', 'Job not found');
        return res.redirect('/freelancer/dashboard');
      }

      //Only the accepted freelancer can mark as ready
      if (!job.acceptedFreelancer || job.acceptedFreelancer.toString() !== userId) {
        req.flash('error_msg', 'Unauthorized action');
        return res.redirect('/freelancer/dashboard');
      }

      if (job.status !== 'in-progress') {
        req.flash('error_msg', 'Job is not in progress');
        return res.redirect('/freelancer/dashboard');
      }

      //Update job status to completed
      job.status = 'completed';
      job.projectEndDate = new Date();
      job.completedAt = new Date();
      await job.save();

      //Send a system message to client notifying completion
      await Message.create({
        sender: job.acceptedFreelancer,
        recipient: job.client,
        job: job._id,
        content: 'Freelancer has marked the job as completed.',
        messageType: 'system'
      });

      req.flash('success_msg', 'Job marked as ready for review.');
      return res.redirect('/freelancer/dashboard');
    } catch (error) {
      console.error('Error marking job ready:', error);
      req.flash('error_msg', 'Failed to update job status');
      return res.redirect('/freelancer/dashboard');
    }
  }

}

module.exports = new FreelancerController();
