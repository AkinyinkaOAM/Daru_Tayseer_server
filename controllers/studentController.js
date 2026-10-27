const Student = require('../models/Student');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION, STUDENT_STATUS, ROLES, GRADE_LEVELS } = require('../utils/constants');
const { sendParentNewStudentEmail } = require('../services/emailService');
const { getOrCreateSubjectCourses } = require('../services/classSubjectService');

// Admin/teacher accounts are restricted to their own assigned class; super admins see everything.
const isRestrictedToOwnGrade = (user) => user.role === ROLES.ADMIN;

/**
 * Generate the next sequential admission number for the given year, e.g. "DTS20260001"
 */
const generateAdmissionNumber = async (year) => {
  const prefix = `DTS${year}`;
  const lastStudent = await Student.findOne({
    admissionNumber: { $regex: `^${prefix}\\d{4}$` },
  }).sort({ admissionNumber: -1 });

  let nextSeq = 1;
  if (lastStudent) {
    const lastSeq = parseInt(lastStudent.admissionNumber.slice(prefix.length), 10);
    if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
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
  // Exclude soft-deleted (inactive) students unless a status is explicitly requested
  filter.status = req.query.status || { $ne: STUDENT_STATUS.INACTIVE };
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
    .populate('createdBy', 'name email')
    .populate('courses', 'name code category');

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
    dateOfBirth,
    gender,
    grade,
    parentName,
    parentEmail,
    parentPhone,
    parentAddress,
    feePaid,
    feeBalance,
  } = req.body;

  if (isRestrictedToOwnGrade(req.user) && grade !== req.user.assignedGrade) {
    return ApiResponse.error(res, 'You can only create students for your assigned class.', 403);
  }

  // Students do not log in; only the parent account needs credentials, keyed
  // by parentEmail so siblings are grouped under the same parent.
  const { parentUser, parentPassword } = await ensureParentUser({
    parentName,
    parentEmail,
    reqUserId: req.user.id,
  });

  // Subjects are automatically assigned based on the selected class
  const courses = await getOrCreateSubjectCourses(grade, req.user.id);

  const currentYear = new Date().getFullYear();
  let student;
  // Retry a couple of times in the unlikely event two requests race for the same sequence number
  for (let attempt = 0; attempt < 3; attempt++) {
    const admissionNumber = await generateAdmissionNumber(currentYear);
    try {
      student = await Student.create({
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
        courses,
        feePaid: feePaid || 0,
        feeBalance: feeBalance || 0,
        createdBy: req.user.id,
      });
      break;
    } catch (error) {
      const isDuplicateAdmissionNumber = error.code === 11000 && error.keyPattern?.admissionNumber;
      if (!isDuplicateAdmissionNumber || attempt === 2) throw error;
    }
  }

  // Notify the parent; include parent portal credentials only if the account is new
  try {
    await sendParentNewStudentEmail({
      parentEmail: student.parentEmail,
      parentName: student.parentName,
      studentName: student.fullName,
      admissionNumber: student.admissionNumber,
      grade: student.grade,
      parentPortalEmail: parentUser.email,
      parentPassword,
    });
  } catch (emailError) {
    console.error('Failed to send parent notification email:', emailError.message);
    // Don't fail the request, but notify the admin
    return ApiResponse.created(res, 'Student created but email notification failed. Please check email configuration.', {
      student,
      emailStatus: 'failed',
    });
  }

  ApiResponse.created(res, 'Student created successfully. Parent has been notified by email.', {
    student,
    parentPortalCredentials: parentPassword ? {
      email: parentUser.email,
      password: parentPassword,
    } : undefined,
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

  // Re-assign subjects automatically whenever the class changes
  if (updates.grade && updates.grade !== student.grade) {
    updates.courses = await getOrCreateSubjectCourses(updates.grade, req.user.id);
  }

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

  // Only validate the field being changed; legacy documents may have stale
  // values (e.g. grade) that no longer match current schema enums.
  student.status = STUDENT_STATUS.INACTIVE;
  await student.save({ validateModifiedOnly: true });

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

  if (isRestrictedToOwnGrade(req.user) && students.some((s) => s.grade !== req.user.assignedGrade)) {
    return ApiResponse.error(res, 'You can only create students for your assigned class.', 403);
  }

  const results = { created: [], failed: [] };
  const currentYear = new Date().getFullYear();

  for (const studentData of students) {
    try {
      const { parentUser, parentPassword } = await ensureParentUser({
        parentName: studentData.parentName,
        parentEmail: studentData.parentEmail,
        reqUserId: req.user.id,
      });

      let student;
      for (let attempt = 0; attempt < 3; attempt++) {
        const admissionNumber = await generateAdmissionNumber(currentYear);
        try {
          student = await Student.create({
            ...studentData,
            admissionNumber,
            parentUser: parentUser._id,
            createdBy: req.user.id,
          });
          break;
        } catch (error) {
          const isDuplicateAdmissionNumber = error.code === 11000 && error.keyPattern?.admissionNumber;
          if (!isDuplicateAdmissionNumber || attempt === 2) throw error;
        }
      }

      // Notify the parent
      try {
        await sendParentNewStudentEmail({
          parentEmail: student.parentEmail,
          parentName: student.parentName,
          studentName: student.fullName,
          admissionNumber: student.admissionNumber,
          grade: student.grade,
          parentPortalEmail: parentUser.email,
          parentPassword,
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

/**
 * @desc    Get student counts grouped by class/grade
 * @route   GET /api/students/stats/grades
 * @access  Private/Admin+
 */
const getGradeStats = asyncHandler(async (req, res) => {
  const stats = await Student.aggregate([
    { $match: { status: { $ne: STUDENT_STATUS.INACTIVE } } },
    { $group: { _id: '$grade', count: { $sum: 1 } } },
  ]);

  const countsByGrade = stats.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const grades = GRADE_LEVELS.map((grade) => ({
    grade,
    studentCount: countsByGrade[grade] || 0,
  }));

  ApiResponse.success(res, 'Grade stats retrieved successfully', {
    grades,
    totalClasses: GRADE_LEVELS.length,
    totalStudents: grades.reduce((sum, g) => sum + g.studentCount, 0),
  });
});

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkCreateStudents,
  getGradeStats,
};

