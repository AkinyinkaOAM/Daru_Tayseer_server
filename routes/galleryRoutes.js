const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove, isSuperAdminOrAbove } = require('../middleware/roles');
const { uploadSingleImage } = require('../middleware/upload');
const {
  getGalleryImages,
  getGalleryImage,
  uploadGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} = require('../controllers/galleryController');

// @route   GET /api/gallery
// @route   GET /api/gallery/:id
// Public routes
router.get('/', getGalleryImages);
router.get('/:id', getGalleryImage);

// @route   POST /api/gallery
router.post(
  '/',
  protect,
  isAdminOrAbove,
  uploadSingleImage,
  [
    body('title').optional().trim(),
    body('category').optional().trim(),
  ],
  validate,
  uploadGalleryImage
);

// @route   PUT /api/gallery/:id
router.put('/:id', protect, isAdminOrAbove, updateGalleryImage);

// @route   DELETE /api/gallery/:id
router.delete('/:id', protect, isSuperAdminOrAbove, deleteGalleryImage);

module.exports = router;

