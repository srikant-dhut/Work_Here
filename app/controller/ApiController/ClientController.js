const Job = require('../../model/JobModel');
const { User } = require('../../model/userModel');

class ClientApiController {

  async getClientJobs(req, res) {
    try {
      const jobs = await Job.find({ client: req.user.userId });
      const user = await User.findById(req.user.userId);

      res.status(200).json({
        success: true,
        user,
        jobs
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  async createJob(req, res) {
    try {
      const {
        title,
        description,
        skills,
        minBudget,
        maxBudget,
        deadline,
        experienceLevel,
        isUrgent
      } = req.body;

      if (!minBudget || !maxBudget || Number(minBudget) >= Number(maxBudget)) {
        return res.status(400).json({ success: false, message: 'Invalid budget range (min < max)' });
      }

      const job = await Job.create({
        title,
        description,
        skills: skills.split(',').map(skill => skill.trim()),
        budget: {
          min: Number(minBudget),
          max: Number(maxBudget),
          currency: 'USD'
        },
        deadline: new Date(deadline),
        status: 'open',
        client: req.user.userId,
        experienceLevel: experienceLevel || 'intermediate',
        isUrgent: isUrgent === true || isUrgent === 'on'
      });

      res.status(201).json({ success: true, message: 'Job created successfully', job });
    } catch (err) {
      console.error('Error creating job:', err);
      res.status(500).json({ success: false, message: 'Failed to create job' });
    }
  }

  async updateJob(req, res) {
    try {
      const jobId = req.params.id;
      const { title, skills, minBudget, maxBudget, deadline, status, experienceLevel, isUrgent } = req.body;

      const updateDoc = {
        title,
        deadline,
        status,
        experienceLevel,
        isUrgent: isUrgent === true || isUrgent === 'on'
      };

      if (skills) {
        updateDoc.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
      }

      if (minBudget && maxBudget) {
        updateDoc.budget = {
          min: Number(minBudget),
          max: Number(maxBudget),
          currency: 'USD'
        };
      }

      const updatedJob = await Job.findByIdAndUpdate(jobId, updateDoc, { new: true });

      if (!updatedJob) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      res.status(200).json({ success: true, message: 'Job updated successfully', job: updatedJob });
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  async deleteJob(req, res) {
    try {
      const jobId = req.params.id;
      const job = await Job.findOneAndDelete({ _id: jobId, client: req.user.userId });

      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found or not authorized' });
      }

      res.status(200).json({ success: true, message: 'Job deleted successfully' });
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

module.exports = new ClientApiController();



