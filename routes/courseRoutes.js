const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isSuperAdminOrAbove } = require('../middleware/roles');
const { SUBJECT_CATEGORIES, GRADE_LEVELS } = require('../utils/constants');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');

// @route   GET /api/courses
// @route   GET /api/courses/:id
// Public routes - no auth required
router.get('/', getCourses);
router.get('/:id', getCourse);

// @route   POST /api/courses
// @route   PUT /api/courses/:id
// @route   DELETE /api/courses/:id
// Protected routes
router.post(
  '/',
  protect,
  isSuperAdminOrAbove,
  [
    body('name').notEmpty().withMessage('Course name is required').trim(),
    body('code').notEmpty().withMessage('Course code is required').trim().toUpperCase(),
    body('category')
      .isIn(SUBJECT_CATEGORIES)
      .withMessage(`Category must be one of: ${SUBJECT_CATEGORIES.join(', ')}`),
    body('gradeLevels')
      .isArray({ min: 1 })
      .withMessage('At least one grade level is required'),
    body('gradeLevels.*')
      .isIn(GRADE_LEVELS)
      .withMessage('Invalid grade level'),
  ],
  validate,
  createCourse
);

router.put('/:id', protect, isSuperAdminOrAbove, updateCourse);
router.delete('/:id', protect, isSuperAdminOrAbove, deleteCourse);

module.exports = router;

