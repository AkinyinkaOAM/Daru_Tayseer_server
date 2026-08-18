const mongoose = require('mongoose');
const { TERMS, CURRENT_SESSION } = require('../utils/constants');

const AcademicRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    type: {
      type: String,
      enum: ['assignment', 'classwork', 'activity'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [180, 'Title cannot exceed 180 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [120, 'Subject cannot exceed 120 characters'],
    },
    term: {
      type: String,
      enum: TERMS,
      default: TERMS[0],
    },
    session: {
      type: String,
      default: CURRENT_SESSION,
    },
    dueDate: Date,
    activityDate: Date,
    attachmentUrl: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AcademicRecord', AcademicRecordSchema);
