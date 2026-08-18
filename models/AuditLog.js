const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Action cannot exceed 100 characters'],
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changes: {
      type: Object,
      default: {},
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
