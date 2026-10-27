const Settings = require('../models/Settings');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { TERMS } = require('../utils/constants');

const SETTINGS_KEY = 'school-settings';

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne({ key: SETTINGS_KEY });
  if (!settings) {
    settings = await Settings.create({ key: SETTINGS_KEY });
  }
  return settings;
};

/**
 * @desc    Get the current term/session settings
 * @route   GET /api/settings
 * @access  Private/Admin+
 */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  ApiResponse.success(res, 'Settings retrieved successfully', { settings, terms: TERMS });
});

/**
 * @desc    Update the current term/session
 * @route   PUT /api/settings
 * @access  Private/SuperAdmin+
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { currentTerm, currentSession } = req.body;

  if (currentTerm !== undefined && !TERMS.includes(currentTerm)) {
    return ApiResponse.error(res, `Term must be one of: ${TERMS.join(', ')}`, 400);
  }

  const settings = await getOrCreateSettings();
  if (currentTerm !== undefined) settings.currentTerm = currentTerm;
  if (currentSession !== undefined) settings.currentSession = currentSession;
  settings.updatedBy = req.user.id;
  await settings.save();

  ApiResponse.success(res, 'Settings updated successfully', { settings });
});

module.exports = {
  getSettings,
  updateSettings,
};
