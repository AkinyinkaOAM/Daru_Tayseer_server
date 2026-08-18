const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove, isSuperAdminOrAbove } = require('../middleware/roles');
const {
  submitApplication,
  getApplications,
  updateApplicationStatus,
  deleteApplication,
} = require('../controllers/admissionController');

router.post(
  '/',
  [
    body('firstName').notEmpty().withMessage('First name is required').trim(),
    body('lastName').notEmpty().withMessage('Last name is required').trim(),
    body('parentName').notEmpty().withMessage('Parent name is required').trim(),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('phone').notEmpty().withMessage('Phone number is required').trim(),
    body('gradeApplied').notEmpty().withMessage('Class/grade is required').trim(),
    body('address').optional().trim(),
    body('note').optional().trim(),
  ],
  validate,
  submitApplication
);

router.get('/', protect, isAdminOrAbove, getApplications);

router.put(
  '/:id/status',
  protect,
  isAdminOrAbove,
  body('status')
    .isIn(['pending', 'accepted', 'rejected'])
    .withMessage('Status must be pending, accepted, or rejected'),
  validate,
  updateApplicationStatus
);

router.delete('/:id', protect, isSuperAdminOrAbove, deleteApplication);

module.exports = router;
