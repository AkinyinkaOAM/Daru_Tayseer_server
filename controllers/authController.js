const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { sendPasswordResetEmail } = require('../services/emailService');

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (mongoose.connection.readyState !== 1) {
    return ApiResponse.error(res, 'Database is unavailable. Please contact the administrator.', 503);
  }

  // Validate input
  if (!email || !password) {
    console.warn(`[AUTH] Login failed: missing credentials ip=${req.ip}`);
    return ApiResponse.error(res, 'Please provide email and password.', 400);
  }

  // Check user exists (include password field)
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    console.warn(`[AUTH] Login failed: unknown email=${normalizedEmail} ip=${req.ip}`);
    return ApiResponse.error(res, 'Invalid credentials.', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    console.warn(`[AUTH] Login failed: inactive account email=${normalizedEmail} ip=${req.ip}`);
    return ApiResponse.error(res, 'This account has been deactivated. Contact administrator.', 401);
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    console.warn(`[AUTH] Login failed: bad password email=${normalizedEmail} ip=${req.ip}`);
    return ApiResponse.error(res, 'Invalid credentials.', 401);
  }

  // Generate token
  const token = user.generateAuthToken();

  // Set cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('token', token, cookieOptions);

  console.log(`[AUTH] Login successful email=${normalizedEmail} role=${user.role} ip=${req.ip}`);

  // Send response
  ApiResponse.success(res, 'Login successful', {
    token,
    user: user.toProfileJSON(),
    mustChangePassword: user.mustChangePassword,
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return ApiResponse.error(res, 'User not found.', 404);
  }

  let profile = user.toProfileJSON();

  if (user.studentId) {
    const student = await Student.findById(user.studentId).lean();
    if (student) {
      profile = {
        ...profile,
        student: {
          id: student._id,
          fullName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          grade: student.grade,
          status: student.status,
        },
      };
    }
  }

  ApiResponse.success(res, 'User profile retrieved', {
    user: profile,
  });
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return ApiResponse.error(res, 'Please provide current and new password.', 400);
  }

  if (newPassword.length < 6) {
    return ApiResponse.error(res, 'New password must be at least 6 characters.', 400);
  }

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return ApiResponse.error(res, 'Current password is incorrect.', 401);
  }

  // Update password
  user.password = newPassword;
  user.passwordChangedAt = Date.now();
  user.mustChangePassword = false;
  await user.save();

  // Generate new token
  const token = user.generateAuthToken();

  ApiResponse.success(res, 'Password updated successfully', { token });
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return ApiResponse.error(res, 'Please provide an email address.', 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    return ApiResponse.error(res, 'No user found with that email.', 404);
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl,
    });

    ApiResponse.success(res, 'Password reset email sent successfully.');
  } catch (error) {
    // Reset token fields on failure
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return ApiResponse.error(
      res,
      'Failed to send password reset email. Please try again later.',
      500
    );
  }
});

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return ApiResponse.error(res, 'Password must be at least 6 characters.', 400);
  }

  // Hash the received token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return ApiResponse.error(res, 'Invalid or expired reset token.', 400);
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();

  // Generate new token
  const authToken = user.generateAuthToken();

  ApiResponse.success(res, 'Password reset successful.', { token: authToken });
});

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
  });

  ApiResponse.success(res, 'Logged out successfully.');
});

/**
 * @desc    Verify the logged-in user's own password (used to unlock protected
 *          actions like broadsheet editing) without changing anything.
 * @route   POST /api/auth/verify-password
 * @access  Private
 */
const verifyPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return ApiResponse.error(res, 'Password is required.', 400);
  }

  const user = await User.findById(req.user.id).select('+password');
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return ApiResponse.error(res, 'Incorrect password.', 401);
  }

  ApiResponse.success(res, 'Password verified.');
});

module.exports = {
  login,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  verifyPassword,
};

