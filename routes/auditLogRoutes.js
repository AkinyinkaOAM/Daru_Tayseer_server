const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { isSuperAdminOrAbove } = require('../middleware/roles');
const { getAuditLogs } = require('../controllers/auditLogController');

router.use(protect, isSuperAdminOrAbove);

router.get('/', getAuditLogs);

module.exports = router;
