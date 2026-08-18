const mongoose = require('mongoose');

const ContactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      trim: true,
      maxlength: [180, 'Subject cannot exceed 180 characters'],
    },
    message: {
      type: String,
      required: [true, 'Please provide your message'],
      trim: true,
      maxlength: [3000, 'Message cannot exceed 3000 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'resolved'],
      default: 'new',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
