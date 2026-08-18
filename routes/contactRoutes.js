const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove } = require('../middleware/roles');
const {
  submitMessage,
  getMessages,
  resolveMessage,
} = require('../controllers/contactController');

// @route   POST /api/contact
// @access  Public
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('subject').notEmpty().withMessage('Subject is required').trim(),
    body('message').notEmpty().withMessage('Message is required').trim(),
  ],
  validate,
  submitMessage
);

// @route   GET /api/contact
// @access  Private/Admin+
router.get('/', protect, isAdminOrAbove, getMessages);

// @route   PUT /api/contact/:id/resolve
// @access  Private/Admin+
router.put('/:id/resolve', protect, isAdminOrAbove, resolveMessage);

module.exports = router;
