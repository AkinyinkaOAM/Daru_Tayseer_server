const AdmissionApplication = require('../models/AdmissionApplication');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');

const submitApplication = asyncHandler(async (req, res) => {
  const application = await AdmissionApplication.create(req.body);

  ApiResponse.created(res, 'Admission application submitted successfully.', {
    application,
  });
});

const getApplications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [applications, total] = await Promise.all([
    AdmissionApplication.find(filter)
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AdmissionApplication.countDocuments(filter),
  ]);

  ApiResponse.paginated(
    res,
    'Admission applications retrieved successfully.',
    applications,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const application = await AdmissionApplication.findById(req.params.id);
  if (!application) {
    return ApiResponse.error(res, 'Admission application not found.', 404);
  }

  application.status = status;
  application.reviewedBy = req.user.id;
  application.reviewedAt = Date.now();
  await application.save();

  ApiResponse.success(res, 'Admission application status updated successfully.', {
    application,
  });
});

const deleteApplication = asyncHandler(async (req, res) => {
  const application = await AdmissionApplication.findById(req.params.id);
  if (!application) {
    return ApiResponse.error(res, 'Admission application not found.', 404);
  }

  await application.deleteOne();
  ApiResponse.success(res, 'Admission application deleted successfully.');
});

module.exports = {
  submitApplication,
  getApplications,
  updateApplicationStatus,
  deleteApplication,
};
