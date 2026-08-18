const AcademicRecord = require('../models/AcademicRecord');
const Student = require('../models/Student');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');

const createAcademicRecord = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.body.student);
  if (!student) {
    return ApiResponse.error(res, 'Student not found.', 404);
  }

  const record = await AcademicRecord.create({
    ...req.body,
    createdBy: req.user.id,
  });

  ApiResponse.created(res, 'Academic record created successfully.', { record });
});

const getAcademicRecords = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.student) filter.student = req.query.student;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.term) filter.term = req.query.term;
  if (req.query.session) filter.session = req.query.session;

  const [records, total] = await Promise.all([
    AcademicRecord.find(filter)
      .populate('student', 'firstName lastName admissionNumber grade')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AcademicRecord.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Academic records retrieved successfully.', records, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const deleteAcademicRecord = asyncHandler(async (req, res) => {
  const record = await AcademicRecord.findById(req.params.id);
  if (!record) {
    return ApiResponse.error(res, 'Academic record not found.', 404);
  }

  await record.deleteOne();
  ApiResponse.success(res, 'Academic record deleted successfully.');
});

module.exports = {
  createAcademicRecord,
  getAcademicRecords,
  deleteAcademicRecord,
};
