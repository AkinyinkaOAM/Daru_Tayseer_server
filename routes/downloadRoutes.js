const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove } = require('../middleware/roles');
const { uploadSingleFile } = require('../middleware/upload');
const {
  getPublicDownloads,
  getAdminDownloads,
  createDownload,
  createDownloadWithFile,
  updateDownload,
  deleteDownload,
} = require('../controllers/downloadController');

router.get('/', getPublicDownloads);
router.get('/admin', protect, isAdminOrAbove, getAdminDownloads);

router.post(
  '/',
  protect,
  isAdminOrAbove,
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('fileUrl').notEmpty().withMessage('File URL is required').trim(),
    body('category')
      .optional()
      .isIn(['admission', 'calendar', 'handbook', 'timetable', 'other'])
      .withMessage('Invalid download category'),
    body('description').optional().trim(),
  ],
  validate,
  createDownload
);

router.post(
  '/upload',
  protect,
  isAdminOrAbove,
  uploadSingleFile,
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('category')
      .optional()
      .isIn(['admission', 'calendar', 'handbook', 'timetable', 'other'])
      .withMessage('Invalid download category'),
    body('description').optional().trim(),
  ],
  validate,
  createDownloadWithFile
);

router.put('/:id', protect, isAdminOrAbove, updateDownload);
router.delete('/:id', protect, isAdminOrAbove, deleteDownload);

module.exports = router;
