const mongoose = require("mongoose");
const Job = require('../../model/JobModel');
const Bid = require('../../model/BidModel');
const Message = require('../../model/MessageModel');
const User = require('../../model/userModel').User;

class FreelancerAPIController {

    async freelancerDashboard(req, res) {
        try {
            const userId = req.user.userId;

            const availableJobs = await Job.aggregate([
                { $match: { status: "open", client: { $ne: new mongoose.Types.ObjectId(userId) } } },
                { $sort: { createdAt: -1 } },
                { $lookup: { from: "users", localField: "client", foreignField: "_id", as: "client" } },
                { $unwind: "$client" },
                { $project: { title: 1, description: 1, skills: 1, status: 1, budget: 1, deadline: 1, createdAt: 1, "client._id": 1, "client.name": 1, "client.email": 1 } }
            ]);

            const activeBids = await Bid.aggregate([
                { $match: { freelancer: new mongoose.Types.ObjectId(userId), status: { $in: ["pending", "accepted"] } } },
                { $sort: { createdAt: -1 } },
                { $lookup: { from: "jobs", localField: "job", foreignField: "_id", as: "job" } },
                { $unwind: "$job" },
                { $lookup: { from: "users", localField: "job.client", foreignField: "_id", as: "job.client" } },
                { $unwind: "$job.client" },
                { $project: { status: 1, createdAt: 1, "job._id": 1, "job.title": 1, "job.description": 1, "job.skills": 1, "job.status": 1, "job.budget": 1, "job.deadline": 1, "job.client._id": 1, "job.client.name": 1, "job.client.email": 1 } }
            ]);

            const acceptedJobs = await Job.aggregate([
                { $match: { acceptedFreelancer: new mongoose.Types.ObjectId(userId), status: { $in: ["in-progress", "completed"] } } },
                { $sort: { updatedAt: -1 } },
                { $lookup: { from: "users", localField: "client", foreignField: "_id", as: "client" } },
                { $unwind: "$client" },
                { $project: { title: 1, description: 1, skills: 1, status: 1, budget: 1, deadline: 1, updatedAt: 1, "client._id": 1, "client.name": 1, "client.email": 1 } }
            ]);

            const completedJobs = await Job.aggregate([
                { $match: { acceptedFreelancer: new mongoose.Types.ObjectId(userId), status: "completed" } },
                { $sort: { completedAt: -1 } },
                { $lookup: { from: "users", localField: "client", foreignField: "_id", as: "client" } },
                { $unwind: "$client" },
                { $lookup: { from: "bids", localField: "_id", foreignField: "job", as: "acceptedBid" } },
                { $addFields: { acceptedBid: { $arrayElemAt: [{ $filter: { input: "$acceptedBid", cond: { $eq: ["$$this.status", "accepted"] } } }, 0] } } },
                { $project: { title: 1, description: 1, skills: 1, status: 1, budget: 1, deadline: 1, updatedAt: 1, completedAt: 1, "client._id": 1, "client.name": 1, "client.email": 1, "acceptedBid.bidAmount": 1 } }
            ]);

            const user = await User.findById(userId).lean();

            res.json({ success: true, data: { availableJobs, activeBids, acceptedJobs, completedJobs, user } });

        } catch (error) {
            console.error("Error loading freelancer dashboard:", error);
            res.status(500).json({ success: false, message: "Failed to load dashboard", error: error.message });
        }
    }

    async viewJobDetails(req, res) {
        try {
            const { jobId } = req.params;
            const userId = req.user.userId;

            const jobs = await Job.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(jobId) } },
                { $lookup: { from: "users", localField: "client", foreignField: "_id", as: "client" } },
                { $unwind: "$client" },
                { $lookup: { from: "users", localField: "acceptedFreelancer", foreignField: "_id", as: "acceptedFreelancer" } },
                { $unwind: { path: "$acceptedFreelancer", preserveNullAndEmptyArrays: true } },
                { $project: { title: 1, description: 1, skills: 1, status: 1, budget: 1, deadline: 1, createdAt: 1, updatedAt: 1, "client._id": 1, "client.name": 1, "client.email": 1, "acceptedFreelancer._id": 1, "acceptedFreelancer.name": 1, "acceptedFreelancer.email": 1 } }
            ]);

            const job = jobs[0];
            if (!job) return res.status(404).json({ success: false, message: "Job not found" });

            if (job.status !== "open") return res.status(400).json({ success: false, message: "Job not accepting bids" });

            const existingBid = await Bid.findOne({ job: jobId, freelancer: userId });

            if (job.client._id.toString() === userId) return res.status(400).json({ success: false, message: "Cannot bid on your own job" });

            const user = await User.findById(userId);

            res.json({ success: true, data: { job, existingBid, user } });

        } catch (error) {
            console.error("Error viewing job details:", error);
            res.status(500).json({ success: false, message: "Failed to load job details", error: error.message });
        }
    }

    async searchJobs(req, res) {
        try {
            const { keyword, minBudget, maxBudget, skills, experienceLevel, isUrgent } = req.query;
            const userId = req.user.userId;

            const filter = { status: "open", client: { $ne: new mongoose.Types.ObjectId(userId) } };

            if (keyword) filter.$or = [{ title: { $regex: keyword, $options: "i" } }, { description: { $regex: keyword, $options: "i" } }];
            if (minBudget || maxBudget) { filter["budget.min"] = {}; if (minBudget) filter["budget.min"].$gte = Number(minBudget); if (maxBudget) filter["budget.max"] = { $lte: Number(maxBudget) }; }
            if (skills) filter.skills = { $in: skills.split(",").map(s => s.trim()) };
            if (experienceLevel) filter.experienceLevel = experienceLevel;
            if (isUrgent === "true") filter.isUrgent = true;

            const jobs = await Job.aggregate([
                { $match: filter },
                { $sort: { createdAt: -1 } },
                { $lookup: { from: "users", localField: "client", foreignField: "_id", as: "client" } },
                { $unwind: "$client" },
                { $project: { title: 1, description: 1, skills: 1, status: 1, budget: 1, deadline: 1, experienceLevel: 1, isUrgent: 1, createdAt: 1, updatedAt: 1, "client._id": 1, "client.name": 1, "client.email": 1 } }
            ]);

            const user = await User.findById(userId).lean();

            res.json({ success: true, data: { jobs, searchParams: req.query, user } });

        } catch (error) {
            console.error("Error searching jobs:", error);
            res.status(500).json({ success: false, message: "Failed to search jobs", error: error.message });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.userId;

            const user = await User.findById(userId).lean();
            if (!user) return res.status(404).json({ success: false, message: "User not found" });

            const bidStats = await Bid.aggregate([
                { $match: { freelancer: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]);

            const completedJobs = await Job.aggregate([
                { $match: { acceptedFreelancer: new mongoose.Types.ObjectId(userId), status: "completed" } },
                { $lookup: { from: "users", localField: "client", foreignField: "_id", as: "client" } },
                { $unwind: "$client" },
                { $lookup: { from: "bids", localField: "acceptedBid", foreignField: "_id", as: "acceptedBid" } },
                { $unwind: { path: "$acceptedBid", preserveNullAndEmptyArrays: true } },
                { $sort: { projectEndDate: -1 } }
            ]);

            const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.acceptedBid?.bidAmount || 0), 0);

            res.json({ success: true, data: { user, bidStats, completedJobs, totalEarnings } });

        } catch (error) {
            console.error("Error loading freelancer profile:", error);
            res.status(500).json({ success: false, message: "Failed to load profile", error: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { name, phone, skills, experienceLevel, hourlyRate, bio } = req.body;

            const updateData = { name, phone: phone ? Number(phone) : undefined };
            if (skills) updateData.skills = skills.split(',').map(s => s.trim());
            if (experienceLevel) updateData.experienceLevel = experienceLevel;
            if (hourlyRate) updateData.hourlyRate = Number(hourlyRate);
            if (bio) updateData.bio = bio;

            const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

            res.json({ success: true, message: "Profile updated successfully", data: updatedUser });

        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
        }
    }

    async markJobReady(req, res) {
        try {
            const { jobId } = req.params;
            const userId = req.user.userId;

            const job = await Job.findById(jobId);
            if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

            if (!job.acceptedFreelancer || job.acceptedFreelancer.toString() !== userId) return res.status(403).json({ success: false, message: 'Unauthorized action' });
            if (job.status !== 'in-progress') return res.status(400).json({ success: false, message: 'Job is not in progress' });

            job.status = 'completed';
            job.projectEndDate = new Date();
            job.completedAt = new Date();
            await job.save();

            await Message.create({
                sender: job.acceptedFreelancer,
                recipient: job.client,
                job: job._id,
                content: 'Freelancer has marked the job as completed.',
                messageType: 'system'
            });

            res.json({ success: true, message: 'Job marked as ready for review.' });

        } catch (error) {
            console.error('Error marking job ready:', error);
            res.status(500).json({ success: false, message: 'Failed to update job status', error: error.message });
        }
    }
}

module.exports = new FreelancerAPIController();
