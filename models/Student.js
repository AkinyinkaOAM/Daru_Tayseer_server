const mongoose = require('mongoose');
const { STUDENT_STATUS, GRADE_LEVELS } = require('../utils/constants');

const StudentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please provide first name'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Please provide last name'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    admissionNumber: {
      type: String,
      unique: true,
      required: [true, 'Please provide admission number'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
    },
    grade: {
      type: String,
      enum: GRADE_LEVELS,
      required: [true, 'Please provide grade/class'],
    },
    status: {
      type: String,
      enum: Object.values(STUDENT_STATUS),
      default: STUDENT_STATUS.ACTIVE,
    },
    // Parent/Guardian Information
    parentName: {
      type: String,
      required: [true, 'Please provide parent/guardian name'],
      trim: true,
    },
    parentEmail: {
      type: String,
      required: [true, 'Please provide parent email'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    parentAddress: {
      type: String,
      trim: true,
    },
    parentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    profileImageUrl: {
      type: String,
      trim: true,
    },
    // Student login credentials (generated)
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    tempPassword: {
      type: String,
      select: false,
    },
    passwordChanged: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    feePaid: {
      type: Number,
      default: 0,
    },
    feeBalance: {
      type: Number,
      default: 0,
    },
    // Who created this student
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

// Virtual for full name
StudentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON output
StudentSchema.set('toJSON', { virtuals: true });
StudentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Student', StudentSchema);

