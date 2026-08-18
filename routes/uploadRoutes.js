const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { isAdminOrAbove } = require('../middleware/roles');
const {
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleFile,
} = require('../middleware/upload');
const {
  uploadImage,
  uploadMultipleImages: uploadMultiple,
  uploadFile,
} = require('../controllers/uploadController');

// All routes require authentication and Admin+ role
router.use(protect, isAdminOrAbove);

// @route   POST /api/upload/image
router.post('/image', uploadSingleImage, uploadImage);

// @route   POST /api/upload/images
router.post('/images', uploadMultipleImages, uploadMultiple);

// @route   POST /api/upload/file
router.post('/file', uploadSingleFile, uploadFile);

module.exports = router;

