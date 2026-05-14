const nodemailer = require('nodemailer');

/**
 * Configure your SMTP settings here.
 * For production, use environment variables.
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.stackmail.com',
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an OTP email.
 * @param {string} to - Recipient email.
 * @param {string} otp - The OTP code.
 */
const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: `"EduPro Academy" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: 'Your EduPro Verification Code',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #002366;">Verify Your Account</h2>
        <p>Hello,</p>
        <p>Thank you for joining EduPro Academy. Please use the following One-Time Password (OTP) to verify your email address:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #002366;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">© 2025 EduPro Academy Global</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send OTP email');
  }
};

/**
 * Generate a random 6-digit OTP.
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { sendOTPEmail, generateOTP };
