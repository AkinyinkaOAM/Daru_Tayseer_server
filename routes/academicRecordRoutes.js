const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove } = require('../middleware/roles');
const {
  createAcademicRecord,
  getAcademicRecords,
  deleteAcademicRecord,
} = require('../controllers/academicRecordController');

router.use(protect, isAdminOrAbove);

router.get('/', getAcademicRecords);

router.post(
  '/',
  [
    body('student').isMongoId().withMessage('Valid student ID is required'),
    body('type')
      .isIn(['assignment', 'classwork', 'activity'])
      .withMessage('Type must be assignment, classwork, or activity'),
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('description').optional().trim(),
    body('subject').optional().trim(),
    body('term').optional().trim(),
    body('session').optional().trim(),
  ],
  validate,
  createAcademicRecord
);

router.delete('/:id', deleteAcademicRecord);

module.exports = router;
