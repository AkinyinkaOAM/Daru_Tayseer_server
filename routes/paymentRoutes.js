const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdminOrAbove } = require('../middleware/roles');
const {
  createPaymentRecord,
  getPaymentRecords,
  downloadPaymentReceipt,
} = require('../controllers/paymentController');

router.use(protect, isAdminOrAbove);

router.get('/', getPaymentRecords);
router.get('/:id/receipt', downloadPaymentReceipt);

router.post(
  '/',
  [
    body('student').isMongoId().withMessage('Valid student ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'transfer', 'card', 'other'])
      .withMessage('Invalid payment method'),
  ],
  validate,
  createPaymentRecord
);

module.exports = router;
