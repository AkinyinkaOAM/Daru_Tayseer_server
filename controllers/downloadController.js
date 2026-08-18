const DownloadResource = require('../models/DownloadResource');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');
const { uploadToCloudinary } = require('../services/cloudinaryService');

const getPublicDownloads = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = { isPublished: true };
  if (req.query.category) filter.category = req.query.category;

  const [downloads, total] = await Promise.all([
    DownloadResource.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DownloadResource.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Downloads retrieved successfully.', downloads, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const getAdminDownloads = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.isPublished !== undefined) {
    filter.isPublished = req.query.isPublished === 'true';
  }

  const [downloads, total] = await Promise.all([
    DownloadResource.find(filter)
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DownloadResource.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Admin downloads retrieved successfully.', downloads, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const createDownload = asyncHandler(async (req, res) => {
  const created = await DownloadResource.create({
    ...req.body,
    uploadedBy: req.user.id,
  });

  ApiResponse.created(res, 'Download resource created successfully.', {
    download: created,
  });
});

const createDownloadWithFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, 'Please upload a file.', 400);
  }

  const uploadResult = await uploadToCloudinary(req.file.buffer, {
    folder: 'daaru_tayseer/downloads',
    resourceType: 'raw',
  });

  const created = await DownloadResource.create({
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    isPublished: req.body.isPublished === true || req.body.isPublished === 'true',
    fileUrl: uploadResult.url,
    uploadedBy: req.user.id,
  });

  ApiResponse.created(res, 'Download resource uploaded successfully.', {
    download: created,
  });
});

const updateDownload = asyncHandler(async (req, res) => {
  const download = await DownloadResource.findById(req.params.id);
  if (!download) {
    return ApiResponse.error(res, 'Download resource not found.', 404);
  }

  const fields = ['title', 'description', 'fileUrl', 'category', 'isPublished'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      download[field] = req.body[field];
    }
  });

  await download.save();

  ApiResponse.success(res, 'Download resource updated successfully.', {
    download,
  });
});

const deleteDownload = asyncHandler(async (req, res) => {
  const download = await DownloadResource.findById(req.params.id);
  if (!download) {
    return ApiResponse.error(res, 'Download resource not found.', 404);
  }

  await download.deleteOne();
  ApiResponse.success(res, 'Download resource deleted successfully.');
});

module.exports = {
  getPublicDownloads,
  getAdminDownloads,
  createDownload,
  createDownloadWithFile,
  updateDownload,
  deleteDownload,
};
