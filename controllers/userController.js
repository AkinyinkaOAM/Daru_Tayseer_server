const User = require('../models/User');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, PAGINATION } = require('../utils/constants');
const { sendUserCredentialsEmail } = require('../services/emailService');

const generateTemporaryPassword = () => crypto.randomBytes(9).toString('base64url');

// A class/grade can only be assigned to one admin (teacher) at a time.
const findTeacherAssignedToGrade = async (grade, excludeUserId) => {
  if (!grade) return null;
  return User.findOne({
    role: ROLES.ADMIN,
    assignedGrade: grade,
    ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
  });
};

const logAudit = async ({ actorId, action, targetUserId, changes = {}, metadata = {} }) => {
  try {
    await AuditLog.create({
      actor: actorId,
      action,
      targetUser: targetUserId,
      changes,
      metadata,
    });
  } catch (error) {
    // Do not block user operations because of logging failures.
    console.error('Audit log creation failed:', error.message);
  }
};

/**
 * @desc    Get all users (paginated)
 * @route   GET /api/users
 * @access  Private/SuperSuperAdmin, SuperAdmin
 */
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  ApiResponse.paginated(
    res,
    'Users retrieved successfully',
    users.map((u) => u.toProfileJSON()),
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private/SuperSuperAdmin, SuperAdmin
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return ApiResponse.error(res, 'User not found.', 404);
  }
  ApiResponse.success(res, 'User retrieved successfully', {
    user: user.toProfileJSON(),
  });
});

/**
 * @desc    Create user (admin/teacher)
 * @route   POST /api/users
 * @access  Private/SuperSuperAdmin, SuperAdmin
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, assignedGrade } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  // Validate role assignment permissions
  if (req.user.role === ROLES.SUPER_ADMIN && role !== ROLES.ADMIN && role) {
    return ApiResponse.error(
      res,
      'Super Admin can only create Admin/Teacher accounts.',
      403
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return ApiResponse.error(res, 'A user with this email already exists.', 400);
  }

  const effectiveRole = role || ROLES.ADMIN;
  if (effectiveRole === ROLES.ADMIN && assignedGrade) {
    const conflictingTeacher = await findTeacherAssignedToGrade(assignedGrade);
    if (conflictingTeacher) {
      return ApiResponse.error(
        res,
        `${assignedGrade} is already assigned to another teacher (${conflictingTeacher.name}).`,
        400
      );
    }
  }

  const temporaryPassword = generateTemporaryPassword();
  const user = await User.create({
    name: name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    password: temporaryPassword,
    phone,
    role: effectiveRole,
    assignedGrade: effectiveRole === ROLES.ADMIN ? assignedGrade : undefined,
    mustChangePassword: true,
    assignedBy: req.user.id,
  });

  try {
    await sendUserCredentialsEmail({
      name: user.name,
      email: user.email,
      role: user.role,
      tempPassword: temporaryPassword,
    });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    return ApiResponse.error(res, 'User was not created because the invitation email could not be sent.', 502);
  }

  await logAudit({
    actorId: req.user.id,
    action: 'user.create',
    targetUserId: user._id,
    changes: {
      role: user.role,
      email: user.email,
      isActive: user.isActive,
    },
  });

  ApiResponse.created(res, 'User created successfully', {
    user: user.toProfileJSON(),
  });
});

/**
 * @desc    Generate and send a new temporary password
 * @route   POST /api/users/:id/resend-invitation
 * @access  Private/SuperSuperAdmin, SuperAdmin
 */
const resendInvitation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) {
    return ApiResponse.error(res, 'User not found.', 404);
  }

  if (
    req.user.role === ROLES.SUPER_ADMIN &&
    user.role === ROLES.SUPER_SUPER_ADMIN
  ) {
    return ApiResponse.error(res, 'Super Admin cannot resend credentials for a Super Super Admin.', 403);
  }

  const previousPassword = user.password;
  const previousMustChangePassword = user.mustChangePassword;
  const temporaryPassword = generateTemporaryPassword();
  user.password = temporaryPassword;
  user.mustChangePassword = true;
  await user.save();

  try {
    await sendUserCredentialsEmail({
      name: user.name,
      email: user.email,
      role: user.role,
      tempPassword: temporaryPassword,
    });
  } catch (error) {
    user.password = previousPassword;
    user.mustChangePassword = previousMustChangePassword;
    await user.save({ validateBeforeSave: false });
    return ApiResponse.error(res, 'Failed to send the new invitation email.', 502);
  }

  ApiResponse.success(res, 'A new temporary password was sent to the user email.');
});

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/SuperSuperAdmin, SuperAdmin
 */
const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, isActive, assignedGrade } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return ApiResponse.error(res, 'User not found.', 404);
  }

  // Prevent Super Admin from changing Super Super Admin
  if (
    req.user.role === ROLES.SUPER_ADMIN &&
    user.role === ROLES.SUPER_SUPER_ADMIN
  ) {
    return ApiResponse.error(
      res,
      'Super Admin cannot modify a Super Super Admin account.',
      403
    );
  }

  // Prevent Super Admin from promoting anyone to Super Admin/Super Super Admin
  if (
    req.user.role === ROLES.SUPER_ADMIN &&
    role &&
    role !== ROLES.ADMIN &&
    role !== user.role
  ) {
    return ApiResponse.error(
      res,
      'Super Admin can only assign the Admin/Teacher role.',
      403
    );
  }

  // Cannot change own role
  if (req.user.id === req.params.id && role && role !== user.role) {
    return ApiResponse.error(res, 'You cannot change your own role.', 400);
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (assignedGrade !== undefined) updates.assignedGrade = assignedGrade;
  if ((role || user.role) !== ROLES.ADMIN) updates.assignedGrade = undefined;

  // A class/grade can only be assigned to one teacher at a time
  if ((role || user.role) === ROLES.ADMIN && updates.assignedGrade) {
    const conflictingTeacher = await findTeacherAssignedToGrade(updates.assignedGrade, user._id);
    if (conflictingTeacher) {
      return ApiResponse.error(
        res,
        `${updates.assignedGrade} is already assigned to another teacher (${conflictingTeacher.name}).`,
        400
      );
    }
  }

  const previousState = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
  };

  const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  const changedFields = {};
  ['name', 'email', 'phone', 'role', 'isActive'].forEach((field) => {
    if (previousState[field] !== updatedUser[field]) {
      changedFields[field] = {
        from: previousState[field],
        to: updatedUser[field],
      };
    }
  });

  if (Object.keys(changedFields).length > 0) {
    await logAudit({
      actorId: req.user.id,
      action: 'user.update',
      targetUserId: updatedUser._id,
      changes: changedFields,
    });
  }

  ApiResponse.success(res, 'User updated successfully', {
    user: updatedUser.toProfileJSON(),
  });
});

/**
 * @desc    Delete user permanently
 * @route   DELETE /api/users/:id
 * @access  Private/SuperSuperAdmin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const actingUser = await User.findById(req.user.id).select('+password');

  if (!actingUser || !(await actingUser.comparePassword(password))) {
    return ApiResponse.error(res, 'Incorrect password. User was not deleted.', 401);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return ApiResponse.error(res, 'User not found.', 404);
  }

  // Prevent deleting self
  if (req.user.id === req.params.id) {
    return ApiResponse.error(res, 'You cannot delete your own account.', 400);
  }

  await User.findByIdAndDelete(user._id);

  await logAudit({
    actorId: req.user.id,
    action: 'user.delete',
    targetUserId: user._id,
    changes: {
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });

  ApiResponse.success(res, 'User permanently deleted.');
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  resendInvitation,
  updateUser,
  deleteUser,
};

