/**
 * Application constants
 */

// User Roles
const ROLES = {
  SUPER_SUPER_ADMIN: 'super_super_admin',
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', // Teacher
  STUDENT: 'student',
  PARENT: 'parent',
};

// Student Status
const STUDENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  GRADUATED: 'graduated',
  SUSPENDED: 'suspended',
};

// Score Status
const SCORE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

// Grade Levels
const GRADE_LEVELS = [
  'Nursery 1',
  'Nursery 2',
  'Kindergarten 1',
  'Kindergarten 2',
  'Primary 1',
  'Primary 2',
  'Primary 3',
  'Primary 4',
  'Primary 5',
  'JSS 1',
  'JSS 2',
  'JSS 3',
  'SSS 1',
  'SSS 2',
  'SSS 3',
];

// Terms
const TERMS = ['First Term', 'Second Term', 'Third Term'];

// Session
const CURRENT_SESSION = '2024/2025';

// Subject Categories
const SUBJECT_CATEGORIES = [
  'Quran',
  'Arabic',
  'Islamic Studies',
  'English',
  'Mathematics',
  'Science',
  'Social Studies',
  'Others',
];

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Upload Limits
const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
};

module.exports = {
  ROLES,
  STUDENT_STATUS,
  SCORE_STATUS,
  GRADE_LEVELS,
  TERMS,
  CURRENT_SESSION,
  SUBJECT_CATEGORIES,
  PAGINATION,
  UPLOAD,
};

