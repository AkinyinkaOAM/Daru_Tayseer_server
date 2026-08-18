const PaymentRecord = require('../models/PaymentRecord');
const Student = require('../models/Student');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');
const PDFDocument = require('pdfkit');

const buildReceiptHtml = ({ payment, student }) => {
  const studentName = `${student.firstName} ${student.lastName}`;
  const amount = Number(payment.amount || 0).toLocaleString();
  const date = new Date(payment.paymentDate || payment.createdAt).toLocaleDateString();
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Payment Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 28px; }
      .head { border-bottom: 2px solid #b30753; padding-bottom: 10px; margin-bottom: 20px; }
      .head h2 { margin: 0; color: #b30753; }
      .grid { display: grid; grid-template-columns: 200px 1fr; row-gap: 8px; column-gap: 12px; }
      .label { font-weight: 700; }
      .footer { margin-top: 24px; font-size: 12px; color: #555; }
    </style>
  </head>
  <body>
    <div class="head">
      <h2>ARABIC SCHOOL OF EASY LEARNING AND ISLAMIC CIVILIZATION</h2>
      <p>Payment Receipt</p>
    </div>

    <div class="grid">
      <div class="label">Student</div><div>${studentName}</div>
      <div class="label">Admission Number</div><div>${student.admissionNumber || '-'}</div>
      <div class="label">Class</div><div>${student.grade || '-'}</div>
      <div class="label">Amount Paid</div><div>${amount}</div>
      <div class="label">Method</div><div>${payment.paymentMethod || '-'}</div>
      <div class="label">Term / Session</div><div>${payment.term || '-'} / ${payment.session || '-'}</div>
      <div class="label">Payment Date</div><div>${date}</div>
      <div class="label">Reference</div><div>${payment.reference || '-'}</div>
      <div class="label">Note</div><div>${payment.note || '-'}</div>
    </div>

    <p class="footer">Powered by: Dev-OAMs</p>
  </body>
</html>`;
};

const createPaymentRecord = asyncHandler(async (req, res) => {
  const { student: studentId, amount } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    return ApiResponse.error(res, 'Student not found.', 404);
  }

  const payment = await PaymentRecord.create({
    ...req.body,
    amount: Number(amount),
    recordedBy: req.user.id,
  });

  const paid = Number(student.feePaid || 0) + Number(amount || 0);
  const balance = Math.max(Number(student.feeBalance || 0) - Number(amount || 0), 0);
  student.feePaid = paid;
  student.feeBalance = balance;
  await student.save();

  ApiResponse.created(res, 'Payment record created successfully.', {
    payment,
    studentFeeSummary: {
      feePaid: student.feePaid,
      feeBalance: student.feeBalance,
    },
  });
});

const getPaymentRecords = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.student) filter.student = req.query.student;
  if (req.query.term) filter.term = req.query.term;
  if (req.query.session) filter.session = req.query.session;

  const [payments, total] = await Promise.all([
    PaymentRecord.find(filter)
      .populate('student', 'firstName lastName admissionNumber grade')
      .populate('recordedBy', 'name email')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PaymentRecord.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Payment records retrieved successfully.', payments, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const downloadPaymentReceipt = asyncHandler(async (req, res) => {
  const payment = await PaymentRecord.findById(req.params.id)
    .populate('student', 'firstName lastName admissionNumber grade');

  if (!payment) {
    return ApiResponse.error(res, 'Payment record not found.', 404);
  }

  const requestedFormat = String(req.query.format || 'pdf').toLowerCase();

  if (requestedFormat === 'html') {
    const html = buildReceiptHtml({ payment, student: payment.student || {} });
    const fileName = `payment-receipt-${payment._id}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(html);
  }

  const fileName = `payment-receipt-${payment._id}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  const student = payment.student || {};
  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  const amount = Number(payment.amount || 0).toLocaleString();
  const date = new Date(payment.paymentDate || payment.createdAt).toLocaleDateString();

  doc.fontSize(16).fillColor('#b30753').text('ARABIC SCHOOL OF EASY LEARNING AND ISLAMIC CIVILIZATION');
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor('#111111').text('Payment Receipt');
  doc.moveDown();

  const rows = [
    ['Student', studentName || '-'],
    ['Admission Number', student.admissionNumber || '-'],
    ['Class', student.grade || '-'],
    ['Amount Paid', amount],
    ['Method', payment.paymentMethod || '-'],
    ['Term / Session', `${payment.term || '-'} / ${payment.session || '-'}`],
    ['Payment Date', date],
    ['Reference', payment.reference || '-'],
    ['Note', payment.note || '-'],
  ];

  rows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
    doc.font('Helvetica').text(String(value));
    doc.moveDown(0.2);
  });

  doc.moveDown();
  doc.fontSize(10).fillColor('#555555').text('Powered by: Dev-OAMs');
  doc.end();
});

module.exports = {
  createPaymentRecord,
  getPaymentRecords,
  downloadPaymentReceipt,
};
