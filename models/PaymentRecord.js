const mongoose = require('mongoose');
const { CURRENT_SESSION, TERMS } = require('../utils/constants');

const PaymentRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer', 'card', 'other'],
      default: 'other',
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [120, 'Reference cannot exceed 120 characters'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters'],
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
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PaymentRecord', PaymentRecordSchema);
