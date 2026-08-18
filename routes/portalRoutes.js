const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { uploadSingleImage } = require('../middleware/upload');
const {
  getStudentPortalSummary,
  updateStudentProfile,
  uploadStudentProfileImage,
  getParentPortalSummary,
} = require('../controllers/portalController');

router.use(protect);

router.get('/student/me', authorize('student'), getStudentPortalSummary);
router.put('/student/profile', authorize('student'), updateStudentProfile);
router.post('/student/profile-image', authorize('student'), uploadSingleImage, uploadStudentProfileImage);

router.get('/parent/me', authorize('parent'), getParentPortalSummary);

module.exports = router;
