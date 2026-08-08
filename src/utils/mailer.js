const nodemailer = require('nodemailer');

/**
 * Configure SMTP settings from environment variables or defaults
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.stackmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false',
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
  console.log(`\n========================================`);
  console.log(`🔑 [OTP VERIFICATION CODE GENERATED]`);
  console.log(`📧 User Email: ${to}`);
  console.log(`🔢 OTP Code:   ${otp}`);
  console.log(`========================================\n`);

  const mailOptions = {
    from: `"OAKSIS Academy" <${process.env.EMAIL_USER || 'noreply@oaksis.edu'}>`,
    to: to,
    subject: 'Your OAKSIS Verification Code',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #006633;">Verify Your Account</h2>
        <p>Hello,</p>
        <p>Thank you for joining OAKSIS Academy. Please use the following One-Time Password (OTP) to verify your email address:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #006633;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">© OAKSIS Academy Global</p>
      </div>
    `
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ EMAIL_USER or EMAIL_PASS not configured. Use OTP printed above in console.');
      return false;
    }
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`⚠️ Failed to deliver OTP email to ${to}:`, error.message);
    console.log(`👉 Please use the OTP code [ ${otp} ] printed above in console to proceed.`);
    return false;
  }
};

/**
 * Generate a random 6-digit OTP.
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { sendOTPEmail, generateOTP };
