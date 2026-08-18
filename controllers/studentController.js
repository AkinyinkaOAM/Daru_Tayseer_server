const Student = require('../models/Student');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION, STUDENT_STATUS, ROLES } = require('../utils/constants');
const { sendStudentCredentialsEmail } = require('../services/emailService');

/**
 * Generate a unique username for student
 */
const generateUsername = (firstName, lastName) => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${firstName.toLowerCase().slice(0, 5)}${lastName.toLowerCase().slice(0, 3)}${randomNum}`;
};

/**
 * Generate a temporary password
 */
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Ensure parent user account exists and return account details.
 */
const ensureParentUser = async ({ parentName, parentEmail, reqUserId }) => {
  let parentUser = await User.findOne({ email: parentEmail });
  let createdPassword = null;

  if (!parentUser) {
    createdPassword = generateTempPassword();
    parentUser = await User.create({
      name: parentName,
      email: parentEmail,
      password: createdPassword,
      role: ROLES.PARENT,
      mustChangePassword: true,
      assignedBy: reqUserId,
    });
  }

  return {
    parentUser,
    parentPassword: createdPassword,
  };
};

/**
 * @desc    Get all students (paginated)
 * @route   GET /api/students
 * @access  Private/Admin+
 */
const getStudents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  if (req.query.grade) filter.grade = req.query.grade;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = [
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } },
      { admissionNumber: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Student.countDocuments(filter),
  ]);

  ApiResponse.paginated(
    res,
    'Students retrieved successfully',
    students,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

/**
 * @desc    Get single student
 * @route   GET /api/students/:id
 * @access  Private/Admin+
 */
const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!student) {
    return ApiResponse.error(res, 'Student not found.', 404);
  }

  ApiResponse.success(res, 'Student retrieved successfully', { student });
});

/**
 * @desc    Create student & send credentials email to parent
 * @route   POST /api/students
 * @access  Private/Admin+
 */
const createStudent = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    admissionNumber,
    dateOfBirth,
    gender,
    grade,
    parentName,
    parentEmail,
    parentPhone,
    parentAddress,
    courses,
    feePaid,
    feeBalance,
  } = req.body;

  // Check for duplicate admission number
  const existingStudent = await Student.findOne({ admissionNumber });
  if (existingStudent) {
    return ApiResponse.error(
      res,
      `A student with admission number '${admissionNumber}' already exists.`,
      400
    );
  }

  // Generate username and temp password
  const username = generateUsername(firstName, lastName);
  const tempPassword = generateTempPassword();
  const { parentUser, parentPassword } = await ensureParentUser({
    parentName,
    parentEmail,
    reqUserId: req.user.id,
  });

  const student = await Student.create({
    firstName,
    lastName,
    admissionNumber,
    dateOfBirth,
    gender,
    grade,
    parentName,
    parentEmail,
    parentPhone,
    parentAddress,
    parentUser: parentUser._id,
    username,
    tempPassword,
    courses: Array.isArray(courses) ? courses : [],
    feePaid: feePaid || 0,
    feeBalance: feeBalance || 0,
    createdBy: req.user.id,
  });

  const portalEmail = `${username}@dtsportal.local`;
  const portalPassword = tempPassword;

  const existingPortalUser = await User.findOne({ email: portalEmail });
  if (!existingPortalUser) {
    await User.create({
      name: student.fullName,
      email: portalEmail,
      password: portalPassword,
      role: ROLES.STUDENT,
      mustChangePassword: true,
      studentId: student._id,
      assignedBy: req.user.id,
    });
  }

  // Send credentials email to parent
  try {
    await sendStudentCredentialsEmail({
      parentEmail: student.parentEmail,
      parentName: student.parentName,
      studentName: student.fullName,
      username: student.username,
      tempPassword,
      grade: student.grade,
    });
  } catch (emailError) {
    console.error('Failed to send credentials email:', emailError.message);
    // Don't fail the request, but notify the admin
    return ApiResponse.created(res, 'Student created but email notification failed. Please check email configuration.', {
      student,
      emailStatus: 'failed',
    });
  }

  ApiResponse.created(res, 'Student created successfully. Credentials sent to parent email.', {
    student,
    portalCredentials: {
      email: portalEmail,
      password: portalPassword,
    },
    parentPortalCredentials: {
      email: parentUser.email,
      password: parentPassword,
    },
    emailStatus: 'sent',
  });
});

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private/Admin+
 */
const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return ApiResponse.error(res, 'Student not found.', 404);
  }

  const allowedUpdates = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'grade',
    'status',
    'parentName',
    'parentEmail',
    'parentPhone',
    'parentAddress',
    'courses',
    'feePaid',
    'feeBalance',
    'profileImageUrl',
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (updates.parentEmail && updates.parentEmail !== student.parentEmail) {
    const { parentUser } = await ensureParentUser({
      parentName: updates.parentName || student.parentName,
      parentEmail: updates.parentEmail,
      reqUserId: req.user.id,
    });
    updates.parentUser = parentUser._id;
  }

  const updatedStudent = await Student.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  ApiResponse.success(res, 'Student updated successfully', {
    student: updatedStudent,
  });
});

/**
 * @desc    Delete student (soft delete - set inactive)
 * @route   DELETE /api/students/:id
 * @access  Private/SuperAdmin+
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const actingUser = await User.findById(req.user.id).select('+password');

  if (!actingUser || !(await actingUser.comparePassword(password))) {
    return ApiResponse.error(res, 'Incorrect password. Student was not deleted.', 401);
  }

  const student = await Student.findById(req.params.id);
  if (!student) {
    return ApiResponse.error(res, 'Student not found.', 404);
  }

  student.status = STUDENT_STATUS.INACTIVE;
  await student.save();

  ApiResponse.success(res, 'Student deactivated successfully.');
});

/**
 * @desc    Bulk create students
 * @route   POST /api/students/bulk
 * @access  Private/Admin+
 */
const bulkCreateStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;

  if (!students || !Array.isArray(students) || students.length === 0) {
    return ApiResponse.error(
      res,
      'Please provide an array of students.',
      400
    );
  }

  if (students.length > 50) {
    return ApiResponse.error(res, 'Maximum 50 students per bulk upload.', 400);
  }

  const results = { created: [], failed: [] };

  for (const studentData of students) {
    try {
      const username = generateUsername(studentData.firstName, studentData.lastName);
      const tempPassword = generateTempPassword();
      const { parentUser } = await ensureParentUser({
        parentName: studentData.parentName,
        parentEmail: studentData.parentEmail,
        reqUserId: req.user.id,
      });

      const student = await Student.create({
        ...studentData,
        parentUser: parentUser._id,
        username,
        tempPassword,
        createdBy: req.user.id,
      });

      // Send email
      try {
        await sendStudentCredentialsEmail({
          parentEmail: student.parentEmail,
          parentName: student.parentName,
          studentName: student.fullName,
          username: student.username,
          tempPassword,
          grade: student.grade,
        });
      } catch (emailErr) {
        console.error(`Email failed for ${student.fullName}:`, emailErr.message);
      }

      results.created.push(student);
    } catch (error) {
      results.failed.push({
        data: studentData,
        error: error.message,
      });
    }
  }

  ApiResponse.created(res, `Bulk creation completed. ${results.created.length} created, ${results.failed.length} failed.`, {
    results,
  });
});

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkCreateStudents,
};

