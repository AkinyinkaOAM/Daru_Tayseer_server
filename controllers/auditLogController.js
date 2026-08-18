const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');

const getAuditLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.targetUser) filter.targetUser = req.query.targetUser;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Audit logs retrieved successfully.', logs, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

module.exports = {
  getAuditLogs,
};
