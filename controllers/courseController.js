const Course = require('../models/Course');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Public
 */
const getCourses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.grade) filter.gradeLevels = req.query.grade;

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Course.countDocuments(filter),
  ]);

  ApiResponse.paginated(
    res,
    'Courses retrieved successfully',
    courses,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

/**
 * @desc    Get single course
 * @route   GET /api/courses/:id
 * @access  Public
 */
const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!course) {
    return ApiResponse.error(res, 'Course not found.', 404);
  }

  ApiResponse.success(res, 'Course retrieved successfully', { course });
});

/**
 * @desc    Create course
 * @route   POST /api/courses
 * @access  Private/SuperAdmin+
 */
const createCourse = asyncHandler(async (req, res) => {
  const { name, code, description, category, gradeLevels } = req.body;

  // Check for duplicate code
  const existingCourse = await Course.findOne({ code: code.toUpperCase() });
  if (existingCourse) {
    return ApiResponse.error(
      res,
      `Course with code '${code.toUpperCase()}' already exists.`,
      400
    );
  }

  const course = await Course.create({
    name,
    code: code.toUpperCase(),
    description,
    category,
    gradeLevels,
    createdBy: req.user.id,
  });

  ApiResponse.created(res, 'Course created successfully', { course });
});

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Private/SuperAdmin+
 */
const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return ApiResponse.error(res, 'Course not found.', 404);
  }

  const allowedUpdates = ['name', 'description', 'category', 'gradeLevels', 'isActive'];
  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // If code is being updated, check for duplicates
  if (req.body.code && req.body.code.toUpperCase() !== course.code) {
    const codeExists = await Course.findOne({ code: req.body.code.toUpperCase() });
    if (codeExists) {
      return ApiResponse.error(
        res,
        `Course with code '${req.body.code.toUpperCase()}' already exists.`,
        400
      );
    }
    updates.code = req.body.code.toUpperCase();
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  ApiResponse.success(res, 'Course updated successfully', {
    course: updatedCourse,
  });
});

/**
 * @desc    Delete course
 * @route   DELETE /api/courses/:id
 * @access  Private/SuperAdmin+
 */
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return ApiResponse.error(res, 'Course not found.', 404);
  }

  // Soft delete
  course.isActive = false;
  await course.save();

  ApiResponse.success(res, 'Course deactivated successfully.');
});

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
};

