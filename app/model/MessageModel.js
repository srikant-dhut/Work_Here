const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'system'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, { timestamps: true });

// Index for efficient querying
messageSchema.index({ sender: 1, recipient: 1, job: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });

// Virtual for message preview
messageSchema.virtual('preview').get(function () {
  if (this.content.length <= 100) return this.content;
  return this.content.substring(0, 100) + '...';
});

messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);
