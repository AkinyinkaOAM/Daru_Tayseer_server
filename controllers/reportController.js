const Student = require('../models/Student');
const Score = require('../models/Score');
const PaymentRecord = require('../models/PaymentRecord');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildBroadsheetRows = async ({ grade, term, session }) => {
  const students = await Student.find({ grade, status: 'active' }).sort({ firstName: 1 });
  const studentIds = students.map((student) => student._id);
  const scores = await Score.find({
    student: { $in: studentIds },
    term,
    session,
  }).sort({ subject: 1 });

  const scoreMap = {};
  scores.forEach((score) => {
    const key = String(score.student);
    if (!scoreMap[key]) {
      scoreMap[key] = [];
    }
    scoreMap[key].push(score);
  });

  const rows = students.map((student) => {
    const studentScores = scoreMap[String(student._id)] || [];
    const total = studentScores.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const average = studentScores.length ? total / studentScores.length : 0;

    return {
      studentId: student._id,
      admissionNumber: student.admissionNumber,
      fullName: student.fullName,
      grade: student.grade,
      subjects: studentScores.map((item) => ({
        subject: item.subject,
        test: item.continuousAssessment,
        exam: item.examScore,
        total: item.total,
        gradeLetter: item.gradeLetter,
      })),
      total,
      average: Number(average.toFixed(2)),
    };
  });

  rows.sort((a, b) => b.average - a.average);
  return rows;
};

const getBroadsheet = asyncHandler(async (req, res) => {
  const { grade, term, session } = req.query;

  if (!grade || !term || !session) {
    return ApiResponse.error(res, 'grade, term, and session are required.', 400);
  }

  const rows = await buildBroadsheetRows({ grade, term, session });

  ApiResponse.success(res, 'Broadsheet generated successfully.', {
    grade,
    term,
    session,
    totalStudents: rows.length,
    rows,
  });
});

const exportBroadsheetCsv = asyncHandler(async (req, res) => {
  const { grade, term, session } = req.query;

  if (!grade || !term || !session) {
    return ApiResponse.error(res, 'grade, term, and session are required.', 400);
  }

  const rows = await buildBroadsheetRows({ grade, term, session });
  const header = ['Admission', 'Student', 'Grade', 'Average', 'Total', 'Subjects'];
  const lines = rows.map((row) => [
    row.admissionNumber,
    row.fullName,
    row.grade,
    row.average,
    row.total,
    row.subjects.length,
  ]);

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

module.exports = {
  getBroadsheet,
  exportBroadsheetCsv,
  exportPaymentsCsv,
};
