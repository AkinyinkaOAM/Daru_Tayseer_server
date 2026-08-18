const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isSuperSuperAdmin, isSuperAdminOrAbove } = require('../middleware/roles');
const { ROLES } = require('../utils/constants');
const {
  getUsers,
  getUser,
  createUser,
  resendInvitation,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

// All routes require authentication
router.use(protect);

// @route   GET /api/users
// @route   POST /api/users
router
  .route('/')
  .get(isSuperAdminOrAbove, getUsers)
  .post(
    isSuperAdminOrAbove,
    [
      body('name').notEmpty().withMessage('Name is required').trim(),
      body('email').isEmail().withMessage('Please provide a valid email'),
      body('role')
        .optional()
        .isIn(Object.values(ROLES))
        .withMessage('Invalid role specified'),
    ],
    validate,
    createUser
  );

router.post('/:id/resend-invitation', isSuperAdminOrAbove, resendInvitation);

// @route   GET /api/users/:id
// @route   PUT /api/users/:id
// @route   DELETE /api/users/:id
router
  .route('/:id')
  .get(isSuperAdminOrAbove, getUser)
  .put(isSuperAdminOrAbove, updateUser)
  .delete(
    isSuperSuperAdmin,
    body('password').notEmpty().withMessage('Your password is required to delete a user.'),
    validate,
    deleteUser
  );

module.exports = router;

