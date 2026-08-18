const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove, isSuperSuperAdmin } = require('../middleware/roles');
const { GRADE_LEVELS } = require('../utils/constants');
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkCreateStudents,
} = require('../controllers/studentController');

// All routes require authentication and at least Admin role
router.use(protect);

// @route   POST /api/students/bulk
router.post(
  '/bulk',
  isAdminOrAbove,
  body('students')
    .isArray({ min: 1 })
    .withMessage('Please provide an array of students'),
  validate,
  bulkCreateStudents
);

// @route   GET /api/students
// @route   POST /api/students
router
  .route('/')
  .get(isAdminOrAbove, getStudents)
  .post(
    isAdminOrAbove,
    [
      body('firstName').notEmpty().withMessage('First name is required').trim(),
      body('lastName').notEmpty().withMessage('Last name is required').trim(),
      body('admissionNumber')
        .notEmpty()
        .withMessage('Admission number is required')
        .trim(),
      body('grade')
        .isIn(GRADE_LEVELS)
        .withMessage(`Grade must be one of: ${GRADE_LEVELS.join(', ')}`),
      body('parentName')
        .notEmpty()
        .withMessage('Parent/Guardian name is required')
        .trim(),
      body('parentEmail')
        .isEmail()
        .withMessage('Please provide a valid parent email'),
    ],
    validate,
    createStudent
  );

// @route   GET /api/students/:id
// @route   PUT /api/students/:id
// @route   DELETE /api/students/:id
router
  .route('/:id')
  .get(isAdminOrAbove, getStudent)
  .put(isAdminOrAbove, updateStudent)
  .delete(
    isSuperSuperAdmin,
    body('password').notEmpty().withMessage('Your password is required to delete a student.'),
    validate,
    deleteStudent
  );

module.exports = router;

