const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proposal: {
    type: String,
    required: true,
    minlength: 10
  },
  bidAmount: {
    type: Number,
    required: true,
    min: 1
  },
  estimatedDelivery: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  acceptedAt: Date,
  clientNotes: String
}, { timestamps: true });

// Ensure one bid per freelancer per job
bidSchema.index({ job: 1, freelancer: 1 }, { unique: true });

// Virtual for calculating days until delivery
bidSchema.virtual('daysUntilDelivery').get(function () {
  if (!this.estimatedDelivery) return null;
  const now = new Date();
  const diffTime = this.estimatedDelivery - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

bidSchema.set('toJSON', { virtuals: true });
bidSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Bid', bidSchema);
