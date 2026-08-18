const NewsEvent = require('../models/NewsEvent');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');

const getPublicNewsEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = { isPublished: true };
  if (req.query.category) filter.category = req.query.category;

  const [items, total] = await Promise.all([
    NewsEvent.find(filter)
      .populate('createdBy', 'name')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    NewsEvent.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'News and events retrieved successfully.', items, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const getAdminNewsEvents = asyncHandler(async (req, res) => {
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

  const [items, total] = await Promise.all([
    NewsEvent.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    NewsEvent.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Admin news list retrieved successfully.', items, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const createNewsEvent = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    createdBy: req.user.id,
  };

  if (payload.isPublished === true || payload.isPublished === 'true') {
    payload.publishedAt = Date.now();
  }

  const created = await NewsEvent.create(payload);

  ApiResponse.created(res, 'News/event created successfully.', {
    item: created,
  });
});

const updateNewsEvent = asyncHandler(async (req, res) => {
  const item = await NewsEvent.findById(req.params.id);
  if (!item) {
    return ApiResponse.error(res, 'News/event item not found.', 404);
  }

  const fields = [
    'title',
    'summary',
    'content',
    'category',
    'eventDate',
    'coverImageUrl',
    'isPublished',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  });

  if (item.isPublished && !item.publishedAt) {
    item.publishedAt = Date.now();
  }

  await item.save();

  ApiResponse.success(res, 'News/event updated successfully.', {
    item,
  });
});

const deleteNewsEvent = asyncHandler(async (req, res) => {
  const item = await NewsEvent.findById(req.params.id);
  if (!item) {
    return ApiResponse.error(res, 'News/event item not found.', 404);
  }

  await item.deleteOne();
  ApiResponse.success(res, 'News/event deleted successfully.');
});

module.exports = {
  getPublicNewsEvents,
  getAdminNewsEvents,
  createNewsEvent,
  updateNewsEvent,
  deleteNewsEvent,
};
