/**
 * Auth Controller
 *
 * Handles the full authentication lifecycle:
 * - OTP-verified signup (send-signup-otp → signup)
 * - Email/password login
 * - Logout (clears httpOnly cookie)
 * - Forgot password (sends reset link via email)
 * - Reset password (OTP-based, no old password needed)
 * - Change password (OTP-based, old password required)
 */

const User = require("../user/user.model");
const PendingVerification = require("./pendingVerification.model");
const bcrypt = require("bcryptjs");
const { generateToken, setAuthCookie } = require("../../utils/auth");
const { encrypt, decrypt, generateOtp } = require("../../utils/crypto");
const { sendSignupOtpEmail, sendResetPasswordEmail, sendChangePasswordEmail } = require("../../services/otp.email.service");
const { getPresignedUrl } = require("../../services/s3.service");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess, sendError } = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

// ─── Step 1: Send Signup OTP ──────────────────────────────────────────────────
// POST /api/auth/send-signup-otp
// Body: { email }
// Sends OTP to email — no user created yet
exports.sendSignupOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  // Note: Joi validateBody(joiSchemas.sendSignupOtp) in auth.routes.js already validates email format

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(res, 400, "Email already in use.");
  }

  const otp       = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  // Upsert — resend if user requests OTP again for the same email
  await PendingVerification.findOneAndUpdate(
    { email },
    { hashedOtp, expiresAt },
    { upsert: true }
  );

  await sendSignupOtpEmail(email, otp);

  sendSuccess(res, 200, "OTP sent to your email. It is valid for 5 minutes.");
});

// ─── Step 2: Signup (OTP verified → User created) ────────────────────────────
// POST /api/auth/signup
// Body: { name, email, password, otp }
// User is only created in DB if OTP is valid
exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, otp } = req.body;

  // Note: Joi validateBody(joiSchemas.signup) in auth.routes.js already validates
  // name, email, password, and OTP format — no need for duplicate manual checks

  // Check OTP record exists
  const pending = await PendingVerification.findOne({ email });
  if (!pending) {
    return sendError(res, 400, "No OTP found for this email. Please request one first.");
  }

  if (pending.expiresAt < new Date()) {
    await PendingVerification.deleteOne({ email });
    return sendError(res, 400, "OTP has expired. Please request a new one.");
  }

  const isMatch = await bcrypt.compare(otp, pending.hashedOtp);
  if (!isMatch) {
    return sendError(res, 400, "Invalid OTP.");
  }

  // OTP valid — check email not registered in the time since OTP was sent
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(res, 400, "Email already in use.");
  }

  // Create user only after OTP verified
  const hashed = await bcrypt.hash(password, 10);
  const user   = await User.create({ name, email, password: hashed });

  // Clean up pending record
  await PendingVerification.deleteOne({ email });

  sendSuccess(res, 201, "Account created successfully.", {
    user: {
      _id:   user._id,
      name:  user.name,
      email: user.email,
    },
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, "Please provide email and password");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) return sendError(res, 400, "Invalid credentials");

  // Block Google/Microsoft OAuth accounts from using password login
  if (user.authProvider !== "local") {
    return sendError(res, 400,
      `This account uses ${user.authProvider} sign-in. Please log in with ${user.authProvider}.`
    );
  }

  if (!user.password) {
    return sendError(res, 400, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return sendError(res, 400, "Invalid credentials");

  const token = generateToken(user._id);

  setAuthCookie(res, token);

  const photoUrl = user.photoS3Key ? await getPresignedUrl(user.photoS3Key) : user.photoUrl || "";

  sendSuccess(res, 200, "Login successful", {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      photo: photoUrl,
    },
  });
});

// ─── Logout ──────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Clears the httpOnly JWT cookie so the user is fully logged out
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  });
  sendSuccess(res, 200, "Logged out successfully");
};

// ─── Forgot Password ─────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Body: { email }
// Sends a link to frontend with otp + encrypted email as query params
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return sendError(res, 400, "Please provide your email.");
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether the email exists — always return success message
    return sendSuccess(res, 200, "If this email exists, a reset link has been sent.");
  }

  // Generate cryptographically secure 6-digit OTP
  const otp = generateOtp();

  // Hash OTP before storing
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.passwordResetOtp = hashedOtp;
  user.passwordResetOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  await user.save();

  // Encrypt email for URL — hides plain email in the link
  const encryptedEmail = encodeURIComponent(encrypt(email));

  const resetLink  = `${process.env.FRONTEND_URL}/change-password?otp=${otp}&email=${encryptedEmail}`;

  await sendResetPasswordEmail(user.email, resetLink);

  sendSuccess(res, 200, "If this email exists, a reset link has been sent.");
});


// ─── Reset Password ───────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Body: { encryptedEmail, otp, newPassword }
// Use when user does NOT know their old password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { encryptedEmail, otp, newPassword } = req.body;

  if (!encryptedEmail || !otp || !newPassword) {
    return sendError(res, 400, "Email, OTP and new password are required.");
  }

  if (newPassword.length < 6) {
    return sendError(res, 400, "Password must be at least 6 characters.");
  }

  // Decrypt email from URL param
  let email;
  try {
    email = decrypt(decodeURIComponent(encryptedEmail));
  } catch {
    return sendError(res, 400, "Invalid request.");
  }

  const user = await User.findOne({ email }).select("+passwordResetOtp +passwordResetOtpExpiry");

  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpiry) {
    return sendError(res, 400, "Invalid or expired OTP.");
  }

  if (user.passwordResetOtpExpiry < new Date()) {
    return sendError(res, 400, "OTP has expired. Please request a new one.");
  }

  const isMatch = await bcrypt.compare(otp, user.passwordResetOtp);
  if (!isMatch) {
    return sendError(res, 400, "Invalid OTP.");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordResetOtp = undefined;
  user.passwordResetOtpExpiry = undefined;
  await user.save();

  sendSuccess(res, 200, "Password reset successful. You can now log in.");
});

// ─── Change Password ──────────────────────────────────────────────────────────
// POST /api/auth/change-password
// Body: { encryptedEmail, otp, oldPassword, newPassword }
// Use when user KNOWS their old password
exports.changePassword = asyncHandler(async (req, res) => {
  const { encryptedEmail, otp, oldPassword, newPassword } = req.body;

  if (!encryptedEmail || !otp || !oldPassword || !newPassword) {
    return sendError(res, 400, "Email, OTP, old password and new password are required.");
  }

  if (newPassword.length < 6) {
    return sendError(res, 400, "New password must be at least 6 characters.");
  }

  // Decrypt email from URL param
  let email;
  try {
    email = decrypt(decodeURIComponent(encryptedEmail));
  } catch {
    return sendError(res, 400, "Invalid request.");
  }

  const user = await User.findOne({ email }).select("+password +passwordResetOtp +passwordResetOtpExpiry");

  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpiry) {
    return sendError(res, 400, "Invalid or expired OTP.");
  }

  if (user.passwordResetOtpExpiry < new Date()) {
    return sendError(res, 400, "OTP has expired. Please request a new one.");
  }

  const isOtpMatch = await bcrypt.compare(otp, user.passwordResetOtp);
  if (!isOtpMatch) {
    return sendError(res, 400, "Invalid OTP.");
  }

  const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordMatch) {
    return sendError(res, 400, "Old password is incorrect.");
  }

  if (oldPassword === newPassword) {
    return sendError(res, 400, "New password must be different from the old password.");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordResetOtp = undefined;
  user.passwordResetOtpExpiry = undefined;
  await user.save();

  sendSuccess(res, 200, "Password changed successfully.");
});