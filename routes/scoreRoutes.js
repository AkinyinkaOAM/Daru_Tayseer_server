const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove, isSuperAdminOrAbove } = require('../middleware/roles');
const { TERMS } = require('../utils/constants');
const {
  getScores,
  getScore,
  createScore,
  updateScore,
  publishScore,
  deleteScore,
  bulkCreateScores,
  getStudentScores,
  getStudentPortalSummary,
} = require('../controllers/scoreController');

// All routes require authentication
router.use(protect);

// @route   GET /api/scores/student/:studentId
router.get('/student/:studentId', isAdminOrAbove, getStudentScores);

// @route   GET /api/scores/portal/me
router.get('/portal/me', protect, getStudentPortalSummary);

// @route   POST /api/scores/bulk
router.post(
  '/bulk',
  isAdminOrAbove,
  body('scores')
    .isArray({ min: 1 })
    .withMessage('Please provide an array of scores'),
  validate,
  bulkCreateScores
);

// @route   GET /api/scores
// @route   POST /api/scores
router
  .route('/')
  .get(isAdminOrAbove, getScores)
  .post(
    isAdminOrAbove,
    [
      body('student')
        .isMongoId()
        .withMessage('Valid student ID is required'),
      body('subject').notEmpty().withMessage('Subject is required').trim(),
      body('term')
        .isIn(TERMS)
        .withMessage(`Term must be one of: ${TERMS.join(', ')}`),
      body('continuousAssessment')
        .optional()
        .isFloat({ min: 0, max: 40 })
        .withMessage('Continuous assessment must be between 0 and 40'),
      body('examScore')
        .optional()
        .isFloat({ min: 0, max: 60 })
        .withMessage('Exam score must be between 0 and 60'),
    ],
    validate,
    createScore
  );

// @route   PUT /api/scores/:id/publish
router.put('/:id/publish', isSuperAdminOrAbove, publishScore);

// @route   GET /api/scores/:id
// @route   PUT /api/scores/:id
// @route   DELETE /api/scores/:id
router
  .route('/:id')
  .get(isAdminOrAbove, getScore)
  .put(isAdminOrAbove, updateScore)
  .delete(isSuperAdminOrAbove, deleteScore);

module.exports = router;

