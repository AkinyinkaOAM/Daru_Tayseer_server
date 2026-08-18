const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove } = require('../middleware/roles');
const {
  getPublicNewsEvents,
  getAdminNewsEvents,
  createNewsEvent,
  updateNewsEvent,
  deleteNewsEvent,
} = require('../controllers/newsEventController');

router.get('/', getPublicNewsEvents);
router.get('/admin', protect, isAdminOrAbove, getAdminNewsEvents);

router.post(
  '/',
  protect,
  isAdminOrAbove,
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('content').notEmpty().withMessage('Content is required').trim(),
    body('category')
      .optional()
      .isIn(['news', 'event', 'holiday'])
      .withMessage('Category must be news, event, or holiday'),
    body('eventDate').optional().isISO8601().withMessage('Event date must be valid'),
    body('coverImageUrl').optional().isString(),
  ],
  validate,
  createNewsEvent
);

router.put('/:id', protect, isAdminOrAbove, updateNewsEvent);
router.delete('/:id', protect, isAdminOrAbove, deleteNewsEvent);

module.exports = router;
