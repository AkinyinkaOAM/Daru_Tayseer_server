const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { isAdminOrAbove } = require('../middleware/roles');
const {
	getBroadsheet,
	exportBroadsheetCsv,
	exportPaymentsCsv,
} = require('../controllers/reportController');

router.use(protect, isAdminOrAbove);

router.get('/broadsheet', getBroadsheet);
router.get('/broadsheet/csv', exportBroadsheetCsv);
router.get('/payments/csv', exportPaymentsCsv);

module.exports = router;
