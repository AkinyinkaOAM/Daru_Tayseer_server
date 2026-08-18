const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ROLES } = require('../utils/constants');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.ADMIN,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Return user object without sensitive fields
UserSchema.methods.toProfileJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isActive: this.isActive,
    mustChangePassword: this.mustChangePassword,
    studentId: this.studentId,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);

