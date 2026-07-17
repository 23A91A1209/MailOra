const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // use Gmail App Password, not account password
  },
});

// Sent during signup to verify email ownership
exports.sendSignupOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"Mail-or-a" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify Your Email — Mail-or-a",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p style="color: #555;">Enter the OTP below to complete your signup. It is valid for <strong>10 minutes</strong>.</p>
        <div style="font-size: 40px; font-weight: bold; letter-spacing: 10px; text-align: center; padding: 20px 0; color: #2563eb;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
};

// Sent when user does NOT know their old password
exports.sendResetPasswordEmail = async (toEmail, resetLink) => {
  await transporter.sendMail({
    from: `"Mail-or-a" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p style="color: #555;">Click the button below to reset your password. This link is valid for <strong>10 minutes</strong>.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}"
             style="display: inline-block; padding: 12px 32px; background: #2563eb; color: #fff; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
};

// Sent when user KNOWS their old password
exports.sendChangePasswordEmail = async (toEmail, changeLink) => {
  await transporter.sendMail({
    from: `"Mail-or-a" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Change Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Change Your Password</h2>
        <p style="color: #555;">Click the button below to change your password. This link is valid for <strong>10 minutes</strong>.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${changeLink}"
             style="display: inline-block; padding: 12px 32px; background: #16a34a; color: #fff; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Change Password
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
};
