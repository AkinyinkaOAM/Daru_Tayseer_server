const mongoose = require('mongoose');

const AdmissionApplicationSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [80, 'First name cannot exceed 80 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [80, 'Last name cannot exceed 80 characters'],
    },
    parentName: {
      type: String,
      required: [true, 'Parent name is required'],
      trim: true,
      maxlength: [120, 'Parent name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [40, 'Phone cannot exceed 40 characters'],
    },
    gradeApplied: {
      type: String,
      required: [true, 'Class/grade applied for is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdmissionApplication', AdmissionApplicationSchema);
