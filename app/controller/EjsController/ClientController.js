const Job = require('../../model/JobModel');
const { User } = require('../../model/userModel');

class ClientController {

  async clientPage(req, res) {
    try {
      const jobs = await Job.find({ client: req.user.userId });
      const user = await User.findById(req.user.userId);
      res.render("clientDashboard", {
        isAuthenticated: req.isAuthenticated,
        user,
        jobs: jobs,
      });
    } catch (error) {
      console.log(error);
    }
  }

  async jobCreatePage(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      res.render("createJob", {
        isAuthenticated: req.isAuthenticated,
        user,
      });
    } catch (error) {
      console.log(error);
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

      // Validate budget
      if (!minBudget || !maxBudget || Number(minBudget) >= Number(maxBudget)) {
        req.flash('error_msg', 'Please provide valid budget range (min < max)');
        return res.redirect('/jobs/create');
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
        isUrgent: isUrgent === 'on'
      });

      req.flash('success_msg', 'Job created successfully');
      res.redirect('/clientPage');
    } catch (err) {
      console.error('Error creating job:', err);
      req.flash('error_msg', 'Failed to create job');
      res.redirect('/jobs/create');
    }
  }

  async getEditJob(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      const jobId = req.params.id;
      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).send('Job not found');
      }

      res.render('jobEditForm', {
        isAuthenticated: req.isAuthenticated,
        user: req.user,
        job,
        user,
      });

    } catch (error) {
      console.error('Error fetching job for edit:', error);
      res.status(500).send('Server Error');
    }
  }

  async postEditJob(req, res) {
    try {
      const jobId = req.params.id;
      const { title, skills, minBudget, maxBudget, deadline, status, experienceLevel, isUrgent } = req.body;

      const updateDoc = {
        title,
        deadline,
        status,
        experienceLevel,
        isUrgent: isUrgent === 'on'
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
        return res.status(404).send('Job not found');
      }

      res.redirect('/clientPage');
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).send('Server Error');
    }
  }

  async deleteJob(req, res) {
    try {
      const jobId = req.params.id;
      const job = await Job.findOneAndDelete({ _id: jobId, client: req.user.userId });

      if (!job) {
        return res.status(404).send('Job not found or you are not authorized to delete it');
      }

      res.redirect('/clientPage');
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).send('Server Error');
    }
  }

}

module.exports = new ClientController();