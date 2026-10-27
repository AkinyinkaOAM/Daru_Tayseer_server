const mongoose = require('mongoose');
const { TERMS } = require('../utils/constants');

// Singleton document (identified by `key`) holding the school's current term/session
const SettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'school-settings',
      unique: true,
    },
    currentTerm: {
      type: String,
      enum: TERMS,
      default: TERMS[0],
    },
    currentSession: {
      type: String,
      trim: true,
      default: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', SettingsSchema);
