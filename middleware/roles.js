const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');

/**
 * Middleware to check user roles
 * @param  {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Not authorized.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Role '${req.user.role}' is not authorized to access this resource.`,
        403
      );
    }

    next();
  };
};

/**
 * Check if user is Super Super Admin (highest level)
 */
const isSuperSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.SUPER_SUPER_ADMIN) {
    return ApiResponse.error(
      res,
      'Only Super Super Admin can perform this action.',
      403
    );
  }
  next();
};

/**
 * Check if user is at least Super Admin level
 */
const isSuperAdminOrAbove = (req, res, next) => {
  if (
    !req.user ||
    (req.user.role !== ROLES.SUPER_SUPER_ADMIN &&
      req.user.role !== ROLES.SUPER_ADMIN)
  ) {
    return ApiResponse.error(
      res,
      'You need Super Admin privileges for this action.',
      403
    );
  }
  next();
};

/**
 * Check if user is at least Admin (Teacher) level
 */
const isAdminOrAbove = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Not authorized.', 401);
  }

  const allowedRoles = [ROLES.SUPER_SUPER_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN];
  if (!allowedRoles.includes(req.user.role)) {
    return ApiResponse.error(
      res,
      'You need Admin privileges for this action.',
      403
    );
  }
  next();
};

module.exports = {
  authorize,
  isSuperSuperAdmin,
  isSuperAdminOrAbove,
  isAdminOrAbove,
};

