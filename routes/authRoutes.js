const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const {
  login,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
} = require('../controllers/authController');

// @route   POST /api/auth/login
router.post(
  '/login',
  loginRateLimiter,
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

// @route   GET /api/auth/me
router.get('/me', protect, getMe);

// @route   PUT /api/auth/update-password
router.put(
  '/update-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  updatePassword
);

// @route   POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Please provide a valid email')],
  validate,
  forgotPassword
);

// @route   PUT /api/auth/reset-password/:token
router.put(
  '/reset-password/:token',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validate,
  resetPassword
);

// @route   POST /api/auth/logout
router.post('/logout', protect, logout);

module.exports = router;

