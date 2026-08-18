const ContactMessage = require('../models/ContactMessage');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');

/**
 * @desc    Submit contact message
 * @route   POST /api/contact
 * @access  Public
 */
const submitMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  const created = await ContactMessage.create({
    name,
    email,
    subject,
    message,
  });

  ApiResponse.created(res, 'Message sent successfully.', {
    message: created,
  });
});

/**
 * @desc    Get contact messages
 * @route   GET /api/contact
 * @access  Private/Admin+
 */
const getMessages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [messages, total] = await Promise.all([
    ContactMessage.find(filter)
      .populate('resolvedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ContactMessage.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Contact messages retrieved successfully.', messages, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

/**
 * @desc    Mark contact message as resolved
 * @route   PUT /api/contact/:id/resolve
 * @access  Private/Admin+
 */
const resolveMessage = asyncHandler(async (req, res) => {
  const contactMessage = await ContactMessage.findById(req.params.id);
  if (!contactMessage) {
    return ApiResponse.error(res, 'Contact message not found.', 404);
  }

  contactMessage.status = 'resolved';
  contactMessage.resolvedBy = req.user.id;
  contactMessage.resolvedAt = Date.now();
  await contactMessage.save();

  ApiResponse.success(res, 'Contact message marked as resolved.', {
    message: contactMessage,
  });
});

module.exports = {
  submitMessage,
  getMessages,
  resolveMessage,
};
