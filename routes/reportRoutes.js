const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { isAdminOrAbove } = require('../middleware/roles');
const {
	getBroadsheet,
	getBroadsheetOptions,
	getStudentReport,
	saveStudentReport,
	exportBroadsheetCsv,
	exportPaymentsCsv,
} = require('../controllers/reportController');

router.use(protect);

// Access control (student-owns-record / teacher-owns-class / super admins) is enforced in the controller.
router.get("/student/:studentId", getStudentReport);
router.put("/student/:studentId", saveStudentReport);

router.get('/broadsheet', isAdminOrAbove, getBroadsheet);
router.get('/broadsheet/options', isAdminOrAbove, getBroadsheetOptions);
router.get('/broadsheet/csv', isAdminOrAbove, exportBroadsheetCsv);
router.get('/payments/csv', isAdminOrAbove, exportPaymentsCsv);


module.exports = router;
