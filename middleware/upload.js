const multer = require('multer');
const path = require('path');
const { UPLOAD } = require('../utils/constants');

// Set storage engine to memory (for Cloudinary upload)
const storage = multer.memoryStorage();

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = file.fieldname === 'image'
    ? UPLOAD.ALLOWED_IMAGE_TYPES
    : UPLOAD.ALLOWED_FILE_TYPES;

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`
      ),
      false
    );
  }
};

// Multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: UPLOAD.MAX_FILE_SIZE,
  },
  fileFilter,
});

// Upload single image
const uploadSingleImage = upload.single('image');

// Upload multiple images (max 10)
const uploadMultipleImages = upload.array('images', 10);

// Upload single file
const uploadSingleFile = upload.single('file');

module.exports = {
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleFile,
};

