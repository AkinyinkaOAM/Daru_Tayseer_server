const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {Object} options - Upload options
 * @param {string} [options.folder] - Cloudinary folder name
 * @param {string} [options.publicId] - Custom public ID
 * @param {string} [options.resourceType='image'] - Resource type (image, video, raw)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'daaru_tayseer',
        public_id: options.publicId,
        resource_type: options.resourceType || 'image',
        ...(options.transformation && { transformation: options.transformation }),
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error('Failed to upload file to Cloudinary'));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      }
    );

    // Convert buffer to readable stream and pipe to upload stream
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} [resourceType='image'] - Resource type
 * @returns {Promise<Object>} Cloudinary deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
};

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @param {number} [options.width] - Image width
 * @param {number} [options.height] - Image height
 * @param {string} [options.quality='auto'] - Image quality
 * @param {string} [options.fet='auto'] - Image format
 * @returns {string} Optimized Cloudinary URL
 */
const getOptimizedUrl = (publicId, options = {}) => {
  const transformation = [];
  
  if (options.width) transformation.push({ width: options.width });
  if (options.height) transformation.push({ height: options.height });
  if (options.quality !== undefined) transformation.push({ quality: options.quality });
  if (options.fetchFormat) transformation.push({ fetch_format: options.fetchFormat });
  
  transformation.push({ fetch_format: 'auto', quality: 'auto' });

  return cloudinary.url(publicId, {
    transformation,
    secure: true,
  });
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl,
};

