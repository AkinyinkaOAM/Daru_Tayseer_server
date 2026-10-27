const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { isAdminOrAbove, isSuperAdminOrAbove } = require('../middleware/roles');
const { getSettings, updateSettings } = require('../controllers/settingsController');

router.use(protect);

router
  .route('/')
  .get(isAdminOrAbove, getSettings)
  .put(isSuperAdminOrAbove, updateSettings);

module.exports = router;
