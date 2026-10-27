const Course = require('../models/Course');
const { CLASS_SUBJECTS } = require('../utils/constants');

/**
 * Build a stable, unique course code from a bilingual subject name
 * by stripping non-ASCII (Arabic) characters and normalizing the rest.
 */
const slugify = (name) => {
  const asciiOnly = name.replace(/[^\x00-\x7F]/g, '').trim();
  const cleaned = asciiOnly.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return (cleaned || 'SUBJECT').toUpperCase().slice(0, 40);
};

/**
 * Get (creating if needed) the Course documents for the subjects
 * assigned to a given class/grade, returning their ObjectIds.
 */
const getOrCreateSubjectCourses = async (grade, createdBy) => {
  const subjects = CLASS_SUBJECTS[grade];
  if (!subjects || !subjects.length) return [];

  const courseIds = [];
  for (const subject of subjects) {
    const code = slugify(subject.name);
    let course = await Course.findOne({ code });

    if (!course) {
      course = await Course.create({
        name: subject.name,
        code,
        category: subject.category,
        gradeLevels: [grade],
        createdBy,
      });
    } else if (!course.gradeLevels.includes(grade)) {
      course.gradeLevels.push(grade);
      await course.save();
    }

    courseIds.push(course._id);
  }

  return courseIds;
};

module.exports = { getOrCreateSubjectCourses };
