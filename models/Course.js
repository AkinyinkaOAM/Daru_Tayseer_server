const mongoose = require('mongoose');
const { GRADE_LEVELS, SUBJECT_CATEGORIES } = require('../utils/constants');

const CourseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide course name'],
      trim: true,
      maxlength: [100, 'Course name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      unique: true,
      required: [true, 'Please provide course code'],
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      enum: SUBJECT_CATEGORIES,
      required: [true, 'Please provide subject category'],
    },
    gradeLevels: [
      {
        type: String,
        enum: GRADE_LEVELS,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
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

module.exports = mongoose.model('Course', CourseSchema);

