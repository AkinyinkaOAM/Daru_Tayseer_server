const Student = require('../models/Student');
const Score = require('../models/Score');
const Report = require("../models/Report");
const PaymentRecord = require('../models/PaymentRecord');
const User = require('../models/User');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, CLASS_SUBJECTS, TERMS } = require('../utils/constants');

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

// Admin/teacher accounts are restricted to their own assigned class; super admins see everything.
const isRestrictedToOwnGrade = (user) => user.role === ROLES.ADMIN;

// Standard "competition ranking" (1, 2, 2, 4, ...): equal values share a rank
// and the next distinct value skips ahead by the number of ties.
const rankDescending = (items, getValue) => {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  let rank = 0;
  let prevValue = null;
  return sorted.map((item, index) => {
    const value = getValue(item);
    if (value !== prevValue) {
      rank = index + 1;
      prevValue = value;
    }
    return { item, rank };
  });
};

// Computes, for a whole class/term/session: each student's overall position
// (ranked by average across their scored subjects) and each score's position
// within its own subject cohort. Shared by the broadsheet and the individual
// report sheet so both surfaces always agree on rank.
const computeClassResults = async ({ grade, term, session }) => {
  const students = await Student.find({ grade, status: 'active' }).sort({ firstName: 1 });
  const studentIds = students.map((student) => student._id);
  const scores = await Score.find({
    student: { $in: studentIds },
    term,
    session,
  }).sort({ subject: 1 });

  const scoresByStudent = {};
  const scoresBySubject = {};
  scores.forEach((score) => {
    const studentKey = String(score.student);
    if (!scoresByStudent[studentKey]) scoresByStudent[studentKey] = [];
    scoresByStudent[studentKey].push(score);

    if (!scoresBySubject[score.subject]) scoresBySubject[score.subject] = [];
    scoresBySubject[score.subject].push(score);
  });

  const subjectPositionByScoreId = {};
  Object.values(scoresBySubject).forEach((group) => {
    rankDescending(group, (score) => Number(score.total || 0)).forEach(({ item, rank }) => {
      subjectPositionByScoreId[String(item._id)] = { position: rank, totalStudents: group.length };
    });
  });

  const studentTotals = students.map((student) => {
    const studentScores = scoresByStudent[String(student._id)] || [];
    const total = studentScores.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const average = studentScores.length ? total / studentScores.length : 0;
    return { student, studentScores, total, average };
  });

  const rankedWithScores = studentTotals.filter((entry) => entry.studentScores.length > 0);
  const overallPositionByStudentId = {};
  rankDescending(rankedWithScores, (entry) => entry.average).forEach(({ item, rank }) => {
    overallPositionByStudentId[String(item.student._id)] = {
      position: rank,
      totalStudents: rankedWithScores.length,
    };
  });

  return { studentTotals, subjectPositionByScoreId, overallPositionByStudentId };
};

// Every row must show the same subjects in the same order (even for students
// missing a score) so the grid's columns line up. Prefer the class's
// configured subject list; fall back to whatever subjects actually have
// scores if the grade isn't in the configured map.
const getSubjectColumns = (grade, studentTotals) => {
  const configured = (CLASS_SUBJECTS[grade] || []).map((subject) => subject.name);
  if (configured.length) return configured;

  const found = new Set();
  studentTotals.forEach(({ studentScores }) => {
    studentScores.forEach((score) => found.add(score.subject));
  });
  return [...found].sort((a, b) => a.localeCompare(b));
};

const buildBroadsheetRows = async ({ grade, term, session }) => {
  const { studentTotals, subjectPositionByScoreId, overallPositionByStudentId } =
    await computeClassResults({ grade, term, session });

  const subjectColumns = getSubjectColumns(grade, studentTotals);

  const rows = studentTotals.map(({ student, studentScores, total, average }) => {
    const overall = overallPositionByStudentId[String(student._id)] || { position: null, totalStudents: 0 };
    const scoreBySubject = {};
    studentScores.forEach((score) => {
      scoreBySubject[score.subject] = score;
    });

    return {
      studentId: student._id,
      admissionNumber: student.admissionNumber,
      fullName: student.fullName,
      grade: student.grade,
      subjects: subjectColumns.map((subject) => {
        const item = scoreBySubject[subject];
        if (!item) {
          return { subject, test: 0, exam: 0, total: 0, gradeLetter: '-', position: null, totalStudents: 0 };
        }
        const subjectRank = subjectPositionByScoreId[String(item._id)] || { position: null, totalStudents: 0 };
        return {
          subject: item.subject,
          test: item.continuousAssessment,
          exam: item.examScore,
          total: item.total,
          gradeLetter: item.gradeLetter,
          position: subjectRank.position,
          totalStudents: subjectRank.totalStudents,
        };
      }),
      total,
      average: Number(average.toFixed(2)),
      position: overall.position,
      totalStudents: overall.totalStudents,
    };
  });

  rows.sort((a, b) => b.average - a.average);
  return { rows, subjectColumns };
};

const getBroadsheet = asyncHandler(async (req, res) => {
  const { term, session } = req.query;
  const grade = isRestrictedToOwnGrade(req.user) ? req.user.assignedGrade : req.query.grade;

  if (!grade || !term || !session) {
    return ApiResponse.error(res, 'grade, term, and session are required.', 400);
  }

  const { rows, subjectColumns } = await buildBroadsheetRows({ grade, term, session });

  ApiResponse.success(res, 'Broadsheet generated successfully.', {
    grade,
    term,
    session,
    subjectColumns,
    totalStudents: rows.length,
    rows,
  });
});

// Returns the term/session combinations that already have scores recorded
// for a class, plus the school's current term/session (so a freshly
// assigned class with no scores yet still has somewhere to land and fill in
// automatically as the teacher uploads scores).
const getBroadsheetOptions = asyncHandler(async (req, res) => {
  const grade = isRestrictedToOwnGrade(req.user) ? req.user.assignedGrade : req.query.grade;

  if (!grade) {
    return ApiResponse.error(res, 'grade is required.', 400);
  }

  const studentIds = (await Student.find({ grade }).select('_id')).map((s) => s._id);
  const combos = await Score.aggregate([
    { $match: { student: { $in: studentIds } } },
    { $group: { _id: { term: '$term', session: '$session' } } },
  ]);

  const keyOf = (term, sess) => `${sess}__${term}`;
  const seen = new Set();
  const options = [];
  combos.forEach(({ _id }) => {
    const key = keyOf(_id.term, _id.session);
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ term: _id.term, session: _id.session });
  });

  const settings = await Settings.findOne();
  if (settings) {
    const key = keyOf(settings.currentTerm, settings.currentSession);
    if (!seen.has(key)) {
      seen.add(key);
      options.push({ term: settings.currentTerm, session: settings.currentSession });
    }
  }

  options.sort((a, b) => {
    if (a.session !== b.session) return b.session.localeCompare(a.session);
    return TERMS.indexOf(a.term) - TERMS.indexOf(b.term);
  });

  ApiResponse.success(res, 'Broadsheet options retrieved.', { grade, options });
});

const exportBroadsheetCsv = asyncHandler(async (req, res) => {
  const { term, session } = req.query;
  const grade = isRestrictedToOwnGrade(req.user) ? req.user.assignedGrade : req.query.grade;

  if (!grade || !term || !session) {
    return ApiResponse.error(res, 'grade, term, and session are required.', 400);
  }

  const { rows, subjectColumns } = await buildBroadsheetRows({ grade, term, session });
  const header = ['S/N', 'Student'];
  subjectColumns.forEach((subject) => {
    header.push(`${subject} (CA)`, `${subject} (Exam)`, `${subject} (Total)`);
  });
  header.push('Grand Total', 'Average', 'Position');

  const lines = rows.map((row, index) => {
    const line = [index + 1, row.fullName];
    row.subjects.forEach((subject) => {
      line.push(subject.test, subject.exam, subject.total);
    });
    line.push(row.total, row.average, row.position ?? '-');
    return line;
  });

  const csv = [header, ...lines]
    .map((line) => line.map((value) => escapeCsv(value)).join(','))
    .join('\n');

  const filename = `broadsheet-${grade}-${term}-${session}.csv`.replace(/\s+/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

const exportPaymentsCsv = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.student) filter.student = req.query.student;
  if (req.query.term) filter.term = req.query.term;
  if (req.query.session) filter.session = req.query.session;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
  if (req.query.fromDate || req.query.toDate) {
    filter.paymentDate = {};
    if (req.query.fromDate) filter.paymentDate.$gte = new Date(req.query.fromDate);
    if (req.query.toDate) {
      const end = new Date(req.query.toDate);
      end.setHours(23, 59, 59, 999);
      filter.paymentDate.$lte = end;
    }
  }

  if (req.query.grade) {
    const gradeStudents = await Student.find({ grade: req.query.grade }).select('_id');
    filter.student = { $in: gradeStudents.map((item) => item._id) };
    if (req.query.student) {
      filter.student = { $in: gradeStudents.map((item) => item._id).filter((id) => String(id) === String(req.query.student)) };
    }
  }

  const payments = await PaymentRecord.find(filter)
    .populate('student', 'firstName lastName admissionNumber')
    .sort({ paymentDate: -1, createdAt: -1 });

  const header = ['Student', 'Admission', 'Amount', 'Method', 'Term', 'Session', 'Date', 'Reference'];
  const lines = payments.map((payment) => [
    `${payment.student?.firstName || ''} ${payment.student?.lastName || ''}`.trim(),
    payment.student?.admissionNumber || '',
    Number(payment.amount || 0),
    payment.paymentMethod || '',
    payment.term || '',
    payment.session || '',
    new Date(payment.paymentDate || payment.createdAt).toLocaleDateString(),
    payment.reference || '',
  ]);

  const csv = [header, ...lines]
    .map((line) => line.map((value) => escapeCsv(value)).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="payments-report.csv"');
  res.status(200).send(csv);
});

// ----------------------------------------------------
// Grade calculator
// ----------------------------------------------------

function calculateGrade(total) {
  if (total >= 70) {
    return {
      grade: "A",
      remark: "Excellent",
    };
  }

  if (total >= 60) {
    return {
      grade: "B",
      remark: "Very Good",
    };
  }

  if (total >= 50) {
    return {
      grade: "C",
      remark: "Good",
    };
  }

  if (total >= 45) {
    return {
      grade: "D",
      remark: "Average",
    };
  }

  if (total >= 40) {
    return {
      grade: "E",
      remark: "Passed",
    };
  }

  return {
    grade: "F",
    remark: "Failed",
  };
}

// ----------------------------------------------------
// Get complete report
// ----------------------------------------------------

exports.getStudentReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { session, term } = req.query;

    if (!session || !term) {
      return res.status(400).json({
        success: false,
        message: "Session and term are required",
      });
    }

    const student = await Student.findById(studentId).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Students may only view their own report; parents only their own ward's;
    // teachers only their own class.
    if (req.user.role === ROLES.STUDENT) {
      if (String(req.user.studentId) !== String(studentId)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this report",
        });
      }
    } else if (req.user.role === ROLES.PARENT) {
      const isOwnWard =
        String(student.parentUser) === String(req.user._id) ||
        (student.parentEmail &&
          student.parentEmail.toLowerCase() === String(req.user.email).toLowerCase());

      if (!isOwnWard) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this report",
        });
      }
    } else if (isRestrictedToOwnGrade(req.user)) {
      if (student.grade !== req.user.assignedGrade) {
        return res.status(403).json({
          success: false,
          message: "You can only view report sheets for your assigned class",
        });
      }
    } else if (![ROLES.SUPER_ADMIN, ROLES.SUPER_SUPER_ADMIN].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this report",
      });
    }

    const [classResults, report] = await Promise.all([
      computeClassResults({ grade: student.grade, term, session }),

      Report.findOne({
        student: studentId,
        session,
        term,
      }).lean(),
    ]);

    const { subjectPositionByScoreId, overallPositionByStudentId, studentTotals } = classResults;
    const myClassEntry = studentTotals.find(
      (entry) => String(entry.student._id) === String(studentId)
    );

    // Fall back to a direct query if the student wasn't part of the ranked
    // (active) cohort, e.g. an inactive/graduated student viewing an old report.
    const rawScores = myClassEntry
      ? myClassEntry.studentScores
      : await Score.find({ student: studentId, session, term }).sort({ subject: 1 }).lean();

    const overall = overallPositionByStudentId[String(studentId)] || { position: null, totalStudents: 0 };

    // Map the Score model's real field names to the report sheet's display shape.
    const scores = rawScores.map((score) => {
      const subjectRank = subjectPositionByScoreId[String(score._id)] || { position: null, totalStudents: 0 };
      return {
        subject: score.subject,
        ca: score.continuousAssessment,
        exam: score.examScore,
        total: score.total,
        grade: score.gradeLetter,
        remark: score.remarks,
        position: subjectRank.position,
        totalStudents: subjectRank.totalStudents,
      };
    });

    const subjectsWithScores = scores.filter(
      (score) =>
        Number(score.ca) > 0 ||
        Number(score.exam) > 0 ||
        Number(score.total) > 0
    );

    const grandTotal = subjectsWithScores.reduce(
      (sum, score) => sum + Number(score.total || 0),
      0
    );

    const maximumTotal = subjectsWithScores.length * 100;

    const percentage =
      maximumTotal > 0
        ? Number(((grandTotal / maximumTotal) * 100).toFixed(1))
        : 0;

    return res.status(200).json({
      success: true,

      data: {
        student,

        report: {
          attendance: 0,
          teacherName: "",
          teacherComment: "",
          principalComment: "",
          nextTermBegins: "",
          promotedTo: "",
          ...report,
          // Position is always freshly computed from the class's current
          // scores, never trusted from a possibly-stale stored value.
          position: overall.position,
        },

        scores,

        summary: {
          subjectsOffered: subjectsWithScores.length,
          grandTotal,
          maximumTotal,
          percentage,
          classSize: overall.totalStudents,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
// ----------------------------------------------------
// Save complete report
// ----------------------------------------------------

exports.saveStudentReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Only the class teacher (admin) can write results, and only for their own class.
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned class teacher can save report sheets",
      });
    }

    const {
      session,
      term,
      attendance,
      teacherName,
      teacherComment,
      principalComment,
      nextTermBegins,
      promotedTo,
      scores,
    } = req.body;

    if (!session || !term) {
      return res.status(400).json({
        success: false,
        message: "Session and term are required",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (student.grade !== req.user.assignedGrade) {
      return res.status(403).json({
        success: false,
        message: "You can only save report sheets for your assigned class",
      });
    }
// ------------------------------------------
    // Save report information
    // ------------------------------------------

    const report = await Report.findOneAndUpdate(
      {
        student: studentId,
        session,
        term,
      },
      {
        student: studentId,
        session,
        term,
        attendance,
        teacherName,
        teacherComment,
        principalComment,
        nextTermBegins,
        promotedTo,
        updatedBy: req.user._id,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    // ------------------------------------------
    // Save scores
    // ------------------------------------------

    if (Array.isArray(scores)) {
      for (const item of scores) {
        if (!item.subject) continue;

        const ca = Math.min(Math.max(Number(item.ca || 0), 0), 30);
        const exam = Math.min(Math.max(Number(item.exam || 0), 0), 70);

        const total = ca + exam;

        const { grade, remark } = calculateGrade(total);

        await Score.findOneAndUpdate(
          {
            student: studentId,
            session,
            term,
            subject: item.subject,
          },
          {
            student: studentId,
            session,
            term,
            subject: item.subject,
            grade: student.grade,
            continuousAssessment: ca,
            examScore: exam,
            total,
            gradeLetter: grade,
            remarks: remark,
            uploadedBy: req.user._id,
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Student report saved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBroadsheet,
  getBroadsheetOptions,
  exportBroadsheetCsv,
  exportPaymentsCsv,
  getStudentReport: exports.getStudentReport,
  saveStudentReport: exports.saveStudentReport,
};
