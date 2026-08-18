const Gallery = require('../models/Gallery');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');

/**
 * @desc    Get all gallery images
 * @route   GET /api/gallery
 * @access  Public
 */
const getGalleryImages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.featured) filter.isFeatured = req.query.featured === 'true';

  const [images, total] = await Promise.all([
    Gallery.find(filter)
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Gallery.countDocuments(filter),
  ]);

  ApiResponse.paginated(
    res,
    'Gallery images retrieved successfully',
    images,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

/**
 * @desc    Get single gallery image
 * @route   GET /api/gallery/:id
 * @access  Public
 */
const getGalleryImage = asyncHandler(async (req, res) => {
  const image = await Gallery.findById(req.params.id)
    .populate('uploadedBy', 'name');

  if (!image) {
    return ApiResponse.error(res, 'Image not found.', 404);
  }

  ApiResponse.success(res, 'Image retrieved successfully', { image });
});

/**
 * @desc    Upload gallery image
 * @route   POST /api/gallery
 * @access  Private/Admin+
 */
const uploadGalleryImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, 'Please upload an image file.', 400);
  }

  const { title, description, category, isFeatured } = req.body;

  // Upload to Cloudinary
  const uploadResult = await uploadToCloudinary(req.file.buffer, {
    folder: 'daaru_tayseer/gallery',
    resourceType: 'image',
  });

  const galleryImage = await Gallery.create({
    title: title || 'Untitled',
    description,
    imageUrl: uploadResult.url,
    cloudinaryPublicId: uploadResult.publicId,
    category: category || 'general',
    isFeatured: isFeatured === true || isFeatured === 'true',
    uploadedBy: req.user.id,
  });

  ApiResponse.created(res, 'Image uploaded successfully', { image: galleryImage });
});

/**
 * @desc    Update gallery image details
 * @route   PUT /api/gallery/:id
 * @access  Private/Admin+
 */
const updateGalleryImage = asyncHandler(async (req, res) => {
  const image = await Gallery.findById(req.params.id);
  if (!image) {
    return ApiResponse.error(res, 'Image not found.', 404);
  }

  const allowedUpdates = ['title', 'description', 'category', 'isFeatured'];
  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updatedImage = await Gallery.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  ApiResponse.success(res, 'Image updated successfully', {
    image: updatedImage,
  });
});

/**
 * @desc    Delete gallery image
 * @route   DELETE /api/gallery/:id
 * @access  Private/SuperAdmin+
 */
const deleteGalleryImage = asyncHandler(async (req, res) => {
  const image = await Gallery.findById(req.params.id);
  if (!image) {
    return ApiResponse.error(res, 'Image not found.', 404);
  }

  // Delete from Cloudinary
  if (image.cloudinaryPublicId) {
    try {
      await deleteFromCloudinary(image.cloudinaryPublicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary delete error:', cloudinaryError.message);
    }
  }

  await image.deleteOne();
  ApiResponse.success(res, 'Image deleted successfully.');
});

module.exports = {
  getGalleryImages,
  getGalleryImage,
  uploadGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
};

