const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { uploadToCloudinary } = require('../services/cloudinaryService');

/**
 * @desc    Upload single image to Cloudinary
 * @route   POST /api/upload/image
 * @access  Private/Admin+
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, 'Please upload an image file.', 400);
  }

  const uploadResult = await uploadToCloudinary(req.file.buffer, {
    folder: 'daaru_tayseer/uploads',
    resourceType: 'image',
  });

  ApiResponse.created(res, 'Image uploaded successfully', {
    url: uploadResult.url,
    publicId: uploadResult.publicId,
    width: uploadResult.width,
    height: uploadResult.height,
    format: uploadResult.format,
    size: uploadResult.bytes,
  });
});

/**
 * @desc    Upload multiple images to Cloudinary
 * @route   POST /api/upload/images
 * @access  Private/Admin+
 */
const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return ApiResponse.error(res, 'Please upload at least one image.', 400);
  }

  const uploadPromises = req.files.map((file) =>
    uploadToCloudinary(file.buffer, {
      folder: 'daaru_tayseer/uploads',
      resourceType: 'image',
    })
  );

  const results = await Promise.allSettled(uploadPromises);

  const uploaded = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      uploaded.push(result.value);
    } else {
      failed.push({
        index,
        name: req.files[index].originalname,
        error: result.reason.message,
      });
    }
  });

  ApiResponse.created(res, `${uploaded.length} images uploaded successfully.`, {
    uploaded,
    failed,
  });
});

/**
 * @desc    Upload file (PDF, doc, etc.)
 * @route   POST /api/upload/file
 * @access  Private/Admin+
 */
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, 'Please upload a file.', 400);
  }

  const uploadResult = await uploadToCloudinary(req.file.buffer, {
    folder: 'daaru_tayseer/files',
    resourceType: 'raw',
  });

  ApiResponse.created(res, 'File uploaded successfully', {
    url: uploadResult.url,
    publicId: uploadResult.publicId,
    format: uploadResult.format,
    size: uploadResult.bytes,
    originalName: req.file.originalname,
  });
});

module.exports = {
  uploadImage,
  uploadMultipleImages,
  uploadFile,
};

