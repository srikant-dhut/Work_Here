const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  skills: [String],
  budget: {
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  deadline: Date,
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'cancelled', 'closed'],
    default: 'open'
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acceptedBid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  },
  acceptedFreelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  projectStartDate: Date,
  projectEndDate: Date,
  completedAt: Date,
  totalBids: { type: Number, default: 0 },
  isUrgent: { type: Boolean, default: false },
  experienceLevel: {
    type: String,
    enum: ['entry', 'intermediate', 'expert'],
    default: 'intermediate'
  }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
