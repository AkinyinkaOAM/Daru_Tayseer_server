const mongoose = require('mongoose');
const { TERMS, CURRENT_SESSION, SCORE_STATUS } = require('../utils/constants');

const ScoreSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Please provide student'], 
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Please provide subject name'],
      trim: true,
    },
    term: {
      type: String,
      enum: TERMS,
      required: [true, 'Please provide term'],
    },
    session: {
      type: String,
      default: CURRENT_SESSION,
      required: [true, 'Please provide academic session'],
    },
    grade: {
      type: String,
      required: [true, 'Please provide student grade/class'],
    },
    // Assessment scores
    continuousAssessment: {
      type: Number,
      min: 0,
      max: 30,
      default: 0,
    },
    examScore: {
      type: Number,
      min: 0,
      max: 70,
      default: 0,
    },
    total: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    gradeLetter: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F'],
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: Object.values(SCORE_STATUS),
      default: SCORE_STATUS.DRAFT,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate total and grade letter
ScoreSchema.pre('save', function () {
  this.total = (this.continuousAssessment || 0) + (this.examScore || 0);

  // if (this.total >= 75) this.gradeLetter = 'A';
  // else if (this.total >= 65) this.gradeLetter = 'B';
  // else if (this.total >= 55) this.gradeLetter = 'C';
  // else if (this.total >= 45) this.gradeLetter = 'D';
  // else if (this.total >= 40) this.gradeLetter = 'E';
  // else this.gradeLetter = 'F';

  if (this.total >= 70) {
    this.gradeLetter = "A";
    this.remarks = "Excellent";
  } else if (this.total >= 60) {
    this.gradeLetter = "B";
    this.remarks = "Very Good";
  } else if (this.total >= 50) {
    this.gradeLetter = "C";
    this.remarks = "Good";
  } else if (this.total >= 45) {
    this.gradeLetter = "D";
    this.remarks = "Average";
  } else if (this.total >= 40) {
    this.gradeLetter = "E";
    this.remarks = "Passed";
  } else {
    this.gradeLetter = "F";
    this.remarks = "Failed";
  }
});

// Prevent duplicate score entry for same student, subject, term, session
ScoreSchema.index(
  { student: 1, subject: 1, term: 1, session: 1 },
  { unique: true }
);

module.exports = mongoose.model('Score', ScoreSchema);

