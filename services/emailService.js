const nodemailer = require('nodemailer');

/**
 * Create Nodemailer transporter using Gmail SMTP
 */
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465, // true for the implicit-TLS port, false for STARTTLS ports like 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text alternative
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Daaru Tayseer School <noreply@daarutayseer.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text && { text: options.text }),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw new Error('Failed to send email. Please check email configuration.');
  }
};

/**
 * Notify a parent that a new ward was added to their account, sharing parent
 * portal login credentials only when a new parent account was just created.
 * @param {Object} options
 * @param {string} options.parentEmail - Parent's email (notification recipient)
 * @param {string} options.parentName - Parent's name
 * @param {string} options.studentName - Student's full name
 * @param {string} options.admissionNumber - Student's admission number
 * @param {string} options.grade - Student's grade/class
 * @param {string} [options.parentPortalEmail] - Parent's portal login email
 * @param {string} [options.parentPassword] - Temporary password (only set for new parent accounts)
 */
const sendParentNewStudentEmail = async (options) => {
  const subject = 'Daaru Tayseer School - Ward Registered';
  const portalUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const credentialsBlock = options.parentPassword
    ? `
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2c3e50; margin-top: 0;">Your Parent Portal Login</h3>
        <p><strong>Email:</strong> ${options.parentPortalEmail}</p>
        <p><strong>Temporary Password:</strong> ${options.parentPassword}</p>
      </div>
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404;">
          <strong>⚠ Important:</strong> Please log in and change your password immediately for security purposes.
        </p>
      </div>
    `
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin-bottom: 5px;">Daaru Tayseer School</h1>
        <p style="color: #7f8c8d; font-size: 14px;">Knowledge, Faith, Character</p>
      </div>

      <p>Dear <strong>${options.parentName}</strong>,</p>

      <p>We are pleased to inform you that <strong>${options.studentName}</strong> has been registered at Daaru Tayseer School.</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2c3e50; margin-top: 0;">Student Details</h3>
        <p><strong>Full Name:</strong> ${options.studentName}</p>
        <p><strong>Admission Number:</strong> ${options.admissionNumber}</p>
        <p><strong>Grade/Class:</strong> ${options.grade}</p>
      </div>

      ${credentialsBlock}

      <p>Use the parent portal at <a href="${portalUrl}" style="color: #3498db;">${portalUrl}</a> to view your ward's academic records, scores and fee balance.</p>

      <p>If you have any questions or concerns, please contact the school administration.</p>

      <p>Best regards,<br>
      <strong>Daaru Tayseer School Administration</strong></p>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="color: #95a5a6; font-size: 12px; text-align: center;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: options.parentEmail,
    subject,
    html,
  });
};

/**
 * Send credentials for a newly created user account.
 */
const sendUserCredentialsEmail = async (options) => {
  const portalUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const subject = 'Welcome to Daaru Tayseer School - Your Account Details';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h1 style="color: #2c3e50;">Daaru Tayseer School</h1>
      <p>Dear <strong>${options.name}</strong>,</p>
      <p>An account has been created for you. Use the details below to sign in:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Email:</strong> ${options.email}</p>
        <p><strong>Role:</strong> ${options.role.replace(/_/g, ' ')}</p>
        <p><strong>Temporary password:</strong> ${options.tempPassword}</p>
      </div>
      <p>For your security, you will be required to choose a new password after your first sign-in.</p>
      <p><a href="${portalUrl}" style="background-color: #198754; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Open School Portal</a></p>
      <p>Best regards,<br><strong>Daaru Tayseer School Administration</strong></p>
    </div>
  `;

  return sendEmail({
    to: options.email,
    subject,
    html,
    text: `Your Daaru Tayseer School account is ${options.email}. Temporary password: ${options.tempPassword}. You must change it after your first sign-in.`,
  });
};

/**
 * Send password reset email
 * @param {Object} options
 * @param {string} options.email - User's email
 * @param {string} options.name - User's name
 * @param {string} options.resetUrl - Password reset URL
 */
const sendPasswordResetEmail = async (options) => {
  const subject = 'Daaru Tayseer School - Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin-bottom: 5px;">Daaru Tayseer School</h1>
        <p style="color: #7f8c8d; font-size: 14px;">Password Reset Request</p>
      </div>
      
      <p>Dear <strong>${options.name}</strong>,</p>
      
      <p>You have requested to reset your password. Click the button below to reset it:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${options.resetUrl}" 
           style="background-color: #3498db; color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all;">
        <a href="${options.resetUrl}" style="color: #3498db;">${options.resetUrl}</a>
      </p>
      
      <p>This link will expire in <strong>1 hour</strong>.</p>
      
      <p>If you did not request a password reset, please ignore this email.</p>
      
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="color: #95a5a6; font-size: 12px; text-align: center;">
        Daaru Tayseer School | Knowledge, Faith, Character
      </p>
    </div>
  `;

  return await sendEmail({
    to: options.email,
    subject,
    html,
  });
};

module.exports = {
  sendEmail,
  sendParentNewStudentEmail,
  sendUserCredentialsEmail,
  sendPasswordResetEmail,
};

