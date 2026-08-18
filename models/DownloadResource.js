const mongoose = require('mongoose');

const DownloadResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['admission', 'calendar', 'handbook', 'timetable', 'other'],
      default: 'other',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DownloadResource', DownloadResourceSchema);
