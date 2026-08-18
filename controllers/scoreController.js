const Score = require('../models/Score');
const Student = require('../models/Student');
const Course = require('../models/Course');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION, SCORE_STATUS } = require('../utils/constants');

/**
 * @desc    Get all scores (paginated, filterable)
 * @route   GET /api/scores
 * @access  Private/Admin+
 */
const getScores = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  if (req.query.student) filter.student = req.query.student;
  if (req.query.grade) filter.grade = req.query.grade;
  if (req.query.subject) filter.subject = { $regex: req.query.subject, $options: 'i' };
  if (req.query.term) filter.term = req.query.term;
  if (req.query.session) filter.session = req.query.session;
  if (req.query.status) filter.status = req.query.status;

  const [scores, total] = await Promise.all([
    Score.find(filter)
      .populate('student', 'firstName lastName admissionNumber grade')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Score.countDocuments(filter),
  ]);

  ApiResponse.paginated(
    res,
    'Scores retrieved successfully',
    scores,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

/**
 * @desc    Get single score
 * @route   GET /api/scores/:id
 * @access  Private/Admin+
 */
const getScore = asyncHandler(async (req, res) => {
  const score = await Score.findById(req.params.id)
    .populate('student', 'firstName lastName admissionNumber grade parentName parentEmail')
    .populate('uploadedBy', 'name email');

  if (!score) {
    return ApiResponse.error(res, 'Score not found.', 404);
  }

  ApiResponse.success(res, 'Score retrieved successfully', { score });
});

/**
 * @desc    Create score entry
 * @route   POST /api/scores
 * @access  Private/Admin+
 */
const createScore = asyncHandler(async (req, res) => {
  const {
    student,
    subject,
    term,
    session,
    grade,
    continuousAssessment,
    examScore,
    remarks,
  } = req.body;

  // Verify student exists
  const studentExists = await Student.findById(student);
  if (!studentExists) {
    return ApiResponse.error(res, 'Student not found.', 404);
  }

  // Check for duplicate score entry
  const existingScore = await Score.findOne({
    student,
    subject: { $regex: `^${subject}$`, $options: 'i' },
    term,
    session,
  });

  if (existingScore) {
    return ApiResponse.error(
      res,
      `Score already exists for ${subject} - ${term} ${session}. Use PUT to update.`,
      409
    );
  }

  const score = await Score.create({
    student,
    subject,
    term,
    session,
    grade: grade || studentExists.grade,
    continuousAssessment: continuousAssessment || 0,
    examScore: examScore || 0,
    remarks,
    uploadedBy: req.user.id,
  });

  ApiResponse.created(res, 'Score created successfully', { score });
});

/**
 * @desc    Update score
 * @route   PUT /api/scores/:id
 * @access  Private/Admin+
 */
const updateScore = asyncHandler(async (req, res) => {
  const score = await Score.findById(req.params.id);
  if (!score) {
    return ApiResponse.error(res, 'Score not found.', 404);
  }

  // Only allow updating scores that are in draft status
  if (score.status === SCORE_STATUS.PUBLISHED) {
    return ApiResponse.error(
      res,
      'Cannot update a published score. Contact Super Admin.',
      400
    );
  }

  const allowedUpdates = [
    'continuousAssessment',
    'examScore',
    'remarks',
    'term',
    'session',
    'grade',
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updatedScore = await Score.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate('student', 'firstName lastName admissionNumber grade');

  ApiResponse.success(res, 'Score updated successfully', {
    score: updatedScore,
  });
});

/**
 * @desc    Publish scores (change status from draft to published)
 * @route   PUT /api/scores/:id/publish
 * @access  Private/SuperAdmin+
 */
const publishScore = asyncHandler(async (req, res) => {
  const score = await Score.findById(req.params.id);
  if (!score) {
    return ApiResponse.error(res, 'Score not found.', 404);
  }

  if (score.status === SCORE_STATUS.PUBLISHED) {
    return ApiResponse.error(res, 'Score is already published.', 400);
  }

  score.status = SCORE_STATUS.PUBLISHED;
  score.publishedAt = Date.now();
  await score.save();

  ApiResponse.success(res, 'Score published successfully', { score });
});

/**
 * @desc    Delete score
 * @route   DELETE /api/scores/:id
 * @access  Private/SuperAdmin+
 */
const deleteScore = asyncHandler(async (req, res) => {
  const score = await Score.findById(req.params.id);
  if (!score) {
    return ApiResponse.error(res, 'Score not found.', 404);
  }

  await score.deleteOne();
  ApiResponse.success(res, 'Score deleted successfully.');
});

/**
 * @desc    Bulk upload scores
 * @route   POST /api/scores/bulk
 * @access  Private/Admin+
 */
const bulkCreateScores = asyncHandler(async (req, res) => {
  const { scores } = req.body;

  if (!scores || !Array.isArray(scores) || scores.length === 0) {
    return ApiResponse.error(res, 'Please provide an array of scores.', 400);
  }

  if (scores.length > 100) {
    return ApiResponse.error(res, 'Maximum 100 scores per bulk upload.', 400);
  }

  const results = { created: [], failed: [] };

  for (const scoreData of scores) {
    try {
      const score = await Score.create({
        ...scoreData,
        uploadedBy: req.user.id,
      });
      results.created.push(score);
    } catch (error) {
      results.failed.push({
        data: scoreData,
        error: error.message,
      });
    }
  }

  ApiResponse.created(
    res,
    `Bulk upload completed. ${results.created.length} created, ${results.failed.length} failed.`,
    { results }
  );
});

/**
 * @desc    Get student's scores (for a specific term/session)
 * @route   GET /api/scores/student/:studentId
 * @access  Private/Admin+
 */
const getStudentScores = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { term, session } = req.query;

  const filter = { student: studentId };
  if (term) filter.term = term;
  if (session) filter.session = session;

  const scores = await Score.find(filter)
    .populate('student', 'firstName lastName admissionNumber grade')
    .sort({ subject: 1 });

  if (!scores || scores.length === 0) {
    return ApiResponse.error(res, 'No scores found for this student.', 404);
  }

  ApiResponse.success(res, 'Student scores retrieved successfully', { scores });
});

const getStudentPortalSummary = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.studentId || req.params.studentId).populate('createdBy', 'name');
  if (!student) {
    return ApiResponse.error(res, 'Student profile not found.', 404);
  }

  const filter = { student: student._id };
  const [scores, courses] = await Promise.all([
    Score.find(filter).sort({ createdAt: -1 }),
    Course.find({ gradeLevels: student.grade, isActive: true }).sort({ name: 1 }),
  ]);

  const books = [
    { title: `${student.grade} Reading Book`, author: 'Daaru Tayseer Press' },
    { title: 'Islamic Studies Workbook', author: 'School Department' },
    { title: 'Mathematics Practice Book', author: 'Academic Team' },
  ];

  const testResults = scores.filter((item) => item.term && item.session);
  const examsResults = scores.filter((item) => item.term && item.session);

  ApiResponse.success(res, 'Student portal summary retrieved', {
    student,
    courses,
    testResults,
    examsResults,
    books,
    feeSummary: {
      totalFee: 50000 + (student.grade?.length || 0) * 1000,
      paidAmount: student.feePaid || 0,
      balance: student.feeBalance || 0,
    },
    summary: {
      totalCourses: courses.length,
      totalScores: scores.length,
      grade: student.grade,
      status: student.status,
    },
  });
});

module.exports = {
  getScores,
  getScore,
  createScore,
  updateScore,
  publishScore,
  deleteScore,
  bulkCreateScores,
  getStudentScores,
  getStudentPortalSummary,
};

