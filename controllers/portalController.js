const Student = require('../models/Student');
const Score = require('../models/Score');
const Course = require('../models/Course');
const AcademicRecord = require('../models/AcademicRecord');
const PaymentRecord = require('../models/PaymentRecord');
const NewsEvent = require('../models/NewsEvent');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { uploadToCloudinary } = require('../services/cloudinaryService');

const getStudentPortalSummary = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.studentId);
  if (!student) {
    return ApiResponse.error(res, 'Student profile not found.', 404);
  }

  const [scores, courses, records, payments] = await Promise.all([
    Score.find({ student: student._id }).sort({ createdAt: -1 }),
    Course.find({ gradeLevels: student.grade, isActive: true }).sort({ name: 1 }),
    AcademicRecord.find({ student: student._id }).sort({ createdAt: -1 }).limit(30),
    PaymentRecord.find({ student: student._id }).sort({ paymentDate: -1 }).limit(30),
  ]);

  ApiResponse.success(res, 'Student portal summary retrieved.', {
    student,
    courses,
    testResults: scores,
    examsResults: scores,
    assignments: records.filter((item) => item.type === 'assignment'),
    classworks: records.filter((item) => item.type === 'classwork'),
    activities: records.filter((item) => item.type === 'activity'),
    paymentHistory: payments,
    feeSummary: {
      totalFee: Number(student.feePaid || 0) + Number(student.feeBalance || 0),
      paidAmount: student.feePaid || 0,
      balance: student.feeBalance || 0,
    },
  });
});

const updateStudentProfile = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.studentId);
  if (!student) {
    return ApiResponse.error(res, 'Student profile not found.', 404);
  }

  const allowed = ['firstName', 'lastName', 'parentPhone', 'parentAddress'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      student[field] = req.body[field];
    }
  });

  await student.save();

  ApiResponse.success(res, 'Student profile updated successfully.', { student });
});

const uploadStudentProfileImage = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.studentId);
  if (!student) {
    return ApiResponse.error(res, 'Student profile not found.', 404);
  }

  if (!req.file) {
    return ApiResponse.error(res, 'Please upload an image file.', 400);
  }

  const uploaded = await uploadToCloudinary(req.file.buffer, {
    folder: 'daaru_tayseer/student_profiles',
    resourceType: 'image',
  });

  student.profileImageUrl = uploaded.url;
  await student.save();

  ApiResponse.success(res, 'Profile image uploaded successfully.', {
    profileImageUrl: student.profileImageUrl,
  });
});

const getParentPortalSummary = asyncHandler(async (req, res) => {
  const wards = await Student.find({
    $or: [{ parentUser: req.user._id }, { parentEmail: req.user.email }],
  }).sort({ firstName: 1 });

  if (!wards.length) {
    return ApiResponse.success(res, 'No wards linked to this parent account yet.', {
      wards: [],
      announcements: [],
    });
  }

  const wardIds = wards.map((ward) => ward._id);

  const [scores, records, payments, announcements] = await Promise.all([
    Score.find({ student: { $in: wardIds } }).sort({ createdAt: -1 }),
    AcademicRecord.find({ student: { $in: wardIds } }).sort({ createdAt: -1 }),
    PaymentRecord.find({ student: { $in: wardIds } }).sort({ paymentDate: -1 }),
    NewsEvent.find({ isPublished: true }).sort({ publishedAt: -1, createdAt: -1 }).limit(10),
  ]);

  const byStudent = {};
  wards.forEach((ward) => {
    byStudent[String(ward._id)] = {
      ward,
      scores: [],
      assignments: [],
      classworks: [],
      activities: [],
      payments: [],
      feeSummary: {
        paidAmount: ward.feePaid || 0,
        balance: ward.feeBalance || 0,
      },
    };
  });

  scores.forEach((item) => {
    const key = String(item.student);
    if (byStudent[key]) byStudent[key].scores.push(item);
  });

  records.forEach((item) => {
    const key = String(item.student);
    if (!byStudent[key]) return;
    if (item.type === 'assignment') byStudent[key].assignments.push(item);
    if (item.type === 'classwork') byStudent[key].classworks.push(item);
    if (item.type === 'activity') byStudent[key].activities.push(item);
  });

  payments.forEach((item) => {
    const key = String(item.student);
    if (byStudent[key]) byStudent[key].payments.push(item);
  });

  ApiResponse.success(res, 'Parent portal summary retrieved.', {
    wards: Object.values(byStudent),
    announcements,
  });
});

module.exports = {
  getStudentPortalSummary,
  updateStudentProfile,
  uploadStudentProfileImage,
  getParentPortalSummary,
};
