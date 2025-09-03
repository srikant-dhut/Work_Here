const mongoose = require("mongoose");
const Bid = require('../../model/BidModel');
const Job = require('../../model/JobModel');
const User = require('../../model/userModel').User;

class BidController {
  //Freelancer submits a bid
  async submitBid(req, res) {
    try {
      const { jobId } = req.params;
      const { proposal, bidAmount, estimatedDelivery } = req.body;
      const freelancerId = req.user.userId;

      //Validate input
      if (!proposal || !bidAmount || !estimatedDelivery) {
        req.flash('error_msg', 'All fields are required');
        return res.redirect(`/freelancer/jobs/${jobId}`);
      }

      //Check if job exists and is open
      const job = await Job.findById(jobId);
      if (!job) {
        req.flash('error_msg', 'Job not found');
        return res.redirect('/freelancer/jobs');
      }

      if (job.status !== 'open') {
        req.flash('error_msg', 'This job is not accepting bids');
        return res.redirect(`/freelancer/jobs/${jobId}`);
      }

      //Check if freelancer already bid on this job
      const existingBid = await Bid.findOne({ job: jobId, freelancer: freelancerId });
      if (existingBid) {
        req.flash('error_msg', 'You have already bid on this job');
        return res.redirect(`/freelancer/jobs/${jobId}`);
      }

      //Create new bid
      const bid = new Bid({
        job: jobId,
        freelancer: freelancerId,
        proposal,
        bidAmount: Number(bidAmount),
        estimatedDelivery: new Date(estimatedDelivery)
      });

      await bid.save();

      //Update job bid count
      await Job.findByIdAndUpdate(jobId, { $inc: { totalBids: 1 } });

      req.flash('success_msg', 'Bid submitted successfully');
      res.redirect(`/freelancer/jobs/${jobId}`);

    } catch (error) {
      console.error('Error submitting bid:', error);
      req.flash('error_msg', 'Failed to submit bid');
      res.redirect(`/freelancer/jobs/${jobId}`);
    }
  }

  //Client views all bids for a job
  async viewJobBids(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;

      //Find job with client details using $lookup
      const jobs = await Job.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(jobId) } },
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
            budget: 1,
            deadline: 1,
            status: 1,
            createdAt: 1,
            skills: 1,
            experienceLevel: 1,
            phone: 1,
            "client._id": 1,
            "client.name": 1,
            "client.email": 1,
          },
        },
      ]);

      const job = jobs.length > 0 ? jobs[0] : null;
      if (!job) {
        req.flash("error_msg", "Job not found");
        return res.redirect("/clientPage");
      }

      if (job.client._id.toString() !== userId) {
        req.flash("error_msg", "Unauthorized access");
        return res.redirect("/clientPage");
      }

      //Get all bids for the job with freelancer details
      const bids = await Bid.aggregate([
        { $match: { job: new mongoose.Types.ObjectId(jobId) } },
        { $sort: { bidAmount: 1, createdAt: 1 } },
        {
          $lookup: {
            from: "users",
            localField: "freelancer",
            foreignField: "_id",
            as: "freelancer",
          },
        },
        { $unwind: "$freelancer" },
        {
          $project: {
            bidAmount: 1,
            coverLetter: 1,
            status: 1,
            createdAt: 1,
            estimatedDelivery: 1,
            daysUntilDelivery: 1,
            "freelancer._id": 1,
            "freelancer.name": 1,
            "freelancer.email": 1,
            "freelancer.phone": 1,
            "freelancer.profilePic": 1,
            "freelancer.city": 1,
            "freelancer.state": 1,
            "freelancer.country": 1,
            "freelancer.skills": 1,
            "freelancer.experienceLevel": 1,
            "freelancer.hourlyRate": 1,
            "freelancer.bio": 1,
            "freelancer.is_verified": 1,
          },
        },
      ]);

      const user = await User.findById(userId).lean();
      res.render("jobBids", {
        job,
        bids,
        user,
        isAuthenticated: true,
      });

    } catch (error) {
      console.error("Error viewing bids:", error);
      req.flash("error_msg", "Failed to load bids");
      res.redirect("/clientPage");
    }
  }

  //Client accepts a bid
  async acceptBid(req, res) {
    try {
      const { bidId } = req.params;
      const userId = req.user.userId;
      const bids = await Bid.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(bidId) } },
        {
          $lookup: {
            from: "jobs",
            localField: "job",
            foreignField: "_id",
            as: "job",
          },
        },
        { $unwind: "$job" },//ensure job is an object, not array
        {
          $project: {
            _id: 1,
            freelancer: 1,
            status: 1,
            createdAt: 1,
            job: {
              _id: 1,
              client: 1,
              status: 1,
            },
          },
        },
      ]);

      const bid = bids.length > 0 ? bids[0] : null;

      if (!bid) {
        req.flash("error_msg", "Bid not found");
        return res.redirect("/clientPage");
      }

      //Check if user owns the job
      if (bid.job.client.toString() !== userId) {
        req.flash("error_msg", "Unauthorized access");
        return res.redirect("/clientPage");
      }

      //Check if job is still open
      if (bid.job.status !== "open") {
        req.flash("error_msg", "Job is no longer accepting bids");
        return res.redirect("/clientPage");
      }

      //Update bid status
      await Bid.findByIdAndUpdate(bidId, {
        status: "accepted",
        acceptedAt: new Date(),
      });

      //Update job status and accepted bid
      await Job.findByIdAndUpdate(bid.job._id, {
        status: "in-progress",
        acceptedBid: bidId,
        acceptedFreelancer: bid.freelancer,
        projectStartDate: new Date(),
      });

      //Reject all other bids for this job
      await Bid.updateMany(
        { job: bid.job._id, _id: { $ne: bidId } },
        { status: "rejected" }
      );

      req.flash("success_msg", "Bid accepted successfully");
      res.redirect("/clientPage");

    } catch (error) {
      console.error("Error accepting bid:", error);
      req.flash("error_msg", "Failed to accept bid");
      res.redirect("/clientPage");
    }
  }

  // Freelancer withdraws a bid
  async withdrawBid(req, res) {
    try {
      const { bidId } = req.params;
      const userId = req.user.userId;

      const bid = await Bid.findById(bidId);
      if (!bid) {
        req.flash('error_msg', 'Bid not found');
        return res.redirect('/freelancer/bids');
      }

      //Check if freelancer owns the bid
      if (bid.freelancer.toString() !== userId) {
        req.flash('error_msg', 'Unauthorized access');
        return res.redirect('/freelancer/bids');
      }

      //Check if bid can be withdrawn
      if (bid.status !== 'pending') {
        req.flash('error_msg', 'Bid cannot be withdrawn');
        return res.redirect('/freelancer/bids');
      }

      bid.status = 'withdrawn';
      await bid.save();

      //Decrease job bid count
      await Job.findByIdAndUpdate(bid.job, { $inc: { totalBids: -1 } });

      req.flash('success_msg', 'Bid withdrawn successfully');
      res.redirect('/freelancer/bids');
    } catch (error) {
      console.error('Error withdrawing bid:', error);
      req.flash('error_msg', 'Failed to withdraw bid');
      res.redirect('/freelancer/bids');
    }
  }

  // Client rejects a bid
  async rejectBid(req, res) {
    try {
      const { bidId } = req.params;
      const userId = req.user.userId;

      // Get bid with job details
      const bids = await Bid.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(bidId) } },
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
          $project: {
            _id: 1,
            freelancer: 1,
            status: 1,
            createdAt: 1,
            job: {
              _id: 1,
              client: 1,
              status: 1,
            },
          },
        },
      ]);

      const bid = bids.length > 0 ? bids[0] : null;

      if (!bid) {
        req.flash("error_msg", "Bid not found");
        return res.redirect("/clientPage");
      }

      // Check if user owns the job
      if (bid.job.client.toString() !== userId) {
        req.flash("error_msg", "Unauthorized access");
        return res.redirect("/clientPage");
      }

      // Check if bid can be rejected
      if (bid.status !== 'pending') {
        req.flash("error_msg", "Bid cannot be rejected");
        return res.redirect("/clientPage");
      }

      // Update bid status to rejected
      await Bid.findByIdAndUpdate(bidId, {
        status: "rejected",
        rejectedAt: new Date(),
      });

      req.flash("success_msg", "Bid rejected successfully");
      res.redirect(`/bids/jobs/${bid.job._id}`);

    } catch (error) {
      console.error("Error rejecting bid:", error);
      req.flash("error_msg", "Failed to reject bid");
      res.redirect("/clientPage");
    }
  }

  // Get freelancer active bids
  async getFreelancerBids(req, res) {
    try {
      const userId = req.user.userId;
      const bids = await Bid.aggregate([
        { $match: { freelancer: new mongoose.Types.ObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "jobs", //collection name in MongoDB
            localField: "job",
            foreignField: "_id",
            as: "job"
          }
        },
        { $unwind: "$job" },
        {
          $lookup: {
            from: "users", //collection name in MongoDB
            localField: "job.client",
            foreignField: "_id",
            as: "job.client"
          }
        },
        { $unwind: "$job.client" },
        {
          $project: {
            amount: 1,
            status: 1,
            createdAt: 1,
            "job._id": 1,
            "job.title": 1,
            "job.status": 1,
            "job.budget": 1,
            "job.deadline": 1,
            "job.client._id": 1,
            "job.client.name": 1,
            "job.client.email": 1
          }
        }
      ]);

      const user = await User.findById(userId);

      res.render("freelancerBids", {
        bids,
        user,
        isAuthenticated: true
      });
    } catch (error) {
      console.error("Error getting freelancer bids:", error);
      req.flash("error_msg", "Failed to load bids");
      res.redirect("/freelancer/dashboard");
    }
  }

}

module.exports = new BidController();
