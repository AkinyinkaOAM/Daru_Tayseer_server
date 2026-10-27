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
  'الروضة Kindergarten',
  'التمهيدي Preparatory',
  'الحضانة Nursery',
  'Arobiyyah 1 الفصل الأول',
  'Arobiyyah 2 الفصل الثانى',
  'Arobiyyah 3 الفصل الثالث',
  'Class Four الفصل الرابعة',
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

// Subjects assigned automatically per class/grade
const CLASS_SUBJECTS = {
  'الروضة Kindergarten': [
    { name: 'حفظ القرآن Quran Memorization', category: 'Quran' },
    { name: 'القراءة Reading', category: 'Arabic' },
    { name: 'التوحيد Taoheed (Monotheism)', category: 'Islamic Studies' },
    { name: 'العربية Arabic Language', category: 'Arabic' },
    { name: 'الحديث Hadith', category: 'Islamic Studies' },
    { name: 'الأدب Moral', category: 'Islamic Studies' },
    { name: 'المحفوظة Rhymes', category: 'Arabic' },
    { name: 'الخط Handwriting', category: 'Arabic' },
  ],
  'التمهيدي Preparatory': [
    { name: 'حفظ القرآن Quran Memorization', category: 'Quran' },
    { name: 'القراءة Reading', category: 'Arabic' },
    { name: 'التوحيد Taoheed (Monotheism)', category: 'Islamic Studies' },
    { name: 'العربية Arabic Language', category: 'Arabic' },
    { name: 'الحديث Hadith', category: 'Islamic Studies' },
    { name: 'الأدب Moral', category: 'Islamic Studies' },
    { name: 'المحفوظة Rhymes', category: 'Arabic' },
    { name: 'الخط Handwriting', category: 'Arabic' },
  ],
  'الحضانة Nursery': [
    { name: 'حفظ القرآن Quran Memorization', category: 'Quran' },
    { name: 'القراءة Reading', category: 'Arabic' },
    { name: 'التوحيد Taoheed (Monotheism)', category: 'Islamic Studies' },
    { name: 'العربية Arabic Language', category: 'Arabic' },
    { name: 'الحديث Hadith', category: 'Islamic Studies' },
    { name: 'الأدب Moral', category: 'Islamic Studies' },
    { name: 'المحفوظة Rhymes', category: 'Arabic' },
    { name: 'الخط Handwriting', category: 'Arabic' },
  ],
  'Arobiyyah 1 الفصل الأول': [
    { name: 'القراءة Reading', category: 'Arabic' },
    { name: 'حفظ القرآن Quran Memorization', category: 'Quran' },
    { name: 'التوحيد Taoheed (Islamic Monotheism)', category: 'Islamic Studies' },
    { name: 'العربية Arabic Language', category: 'Arabic' },
    { name: 'الحديث Hadith', category: 'Islamic Studies' },
    { name: 'الأدب/الأخلاق Adab', category: 'Islamic Studies' },
    { name: 'المحفوظة Rhymes', category: 'Arabic' },
    { name: 'الخط Handwriting', category: 'Arabic' },
    { name: 'الإملأ Dictation', category: 'Arabic' },
    { name: 'السيرة Biography', category: 'Islamic Studies' },
    { name: 'الفقه Jurisprudence', category: 'Islamic Studies' },
  ],
  'Arobiyyah 2 الفصل الثانى': [
    { name: 'القراءة Reading', category: 'Arabic' },
    { name: 'حفظ القرآن Quran Memorization', category: 'Quran' },
    { name: 'التوحيد Tajweed', category: 'Quran' },
    { name: 'العربية Arabic Language', category: 'Arabic' },
    { name: 'الحديث Hadith', category: 'Islamic Studies' },
    { name: 'الأدب Adab', category: 'Islamic Studies' },
    { name: 'التجويد Intonation', category: 'Quran' },
    { name: 'المحفوظة Memorization', category: 'Arabic' },
    { name: 'الخط Writing', category: 'Arabic' },
    { name: 'الإملأ Dictation', category: 'Arabic' },
    { name: 'السيرة Biography', category: 'Islamic Studies' },
    { name: 'الفقه Jurisprudence', category: 'Islamic Studies' },
  ],
  'Arobiyyah 3 الفصل الثالث': [
    { name: 'حفظ القرآن Quran Memorization', category: 'Quran' },
    { name: 'التوحيد Tajweed', category: 'Quran' },
    { name: 'العربية Arabic Language', category: 'Arabic' },
    { name: 'النحو Nahwu (Grammar)', category: 'Arabic' },
    { name: 'الصرف Sarfu (Morphology)', category: 'Arabic' },
    { name: 'الحديث Hadith', category: 'Islamic Studies' },
    { name: 'الأدب/الأخلاق Adab', category: 'Islamic Studies' },
    { name: 'التجويد Intonation', category: 'Quran' },
    { name: 'المحفوظة Rhymes', category: 'Arabic' },
    { name: 'الخط Handwriting', category: 'Arabic' },
    { name: 'الإملأ Dictation', category: 'Arabic' },
    { name: 'السيرة Biography', category: 'Islamic Studies' },
    { name: 'الفقه Jurisprudence', category: 'Islamic Studies' },
  ],
  'Class Four الفصل الرابعة': [
    { name: 'حفظ القرآن Quran Memorization', category: 'Quran' },
    { name: 'التوحيد Tajweed', category: 'Quran' },
    { name: 'العربية Arabic Language', category: 'Arabic' },
    { name: 'النحو Nahwu (Grammar)', category: 'Arabic' },
    { name: 'الصرف Sarfu (Morphology)', category: 'Arabic' },
    { name: 'الحديث Hadith', category: 'Islamic Studies' },
    { name: 'الأدب/الأخلاق Adab', category: 'Islamic Studies' },
    { name: 'التجويد Intonation', category: 'Quran' },
    { name: 'المحفوظة Rhymes', category: 'Arabic' },
    { name: 'الخط Handwriting', category: 'Arabic' },
    { name: 'الإملأ Dictation', category: 'Arabic' },
    { name: 'السيرة Biography', category: 'Islamic Studies' },
    { name: 'الفقه Jurisprudence', category: 'Islamic Studies' },
  ],
};

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
  CLASS_SUBJECTS,
  PAGINATION,
  UPLOAD,
};

