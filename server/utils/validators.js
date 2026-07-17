/**
 * Validators — Centralized Input Validation Utilities
 *
 * Provides reusable validation functions for API request bodies.
 * Eliminates duplicated regex patterns and inline validation logic
 * across controllers.
 *
 * Usage in controllers:
 *   const { validateEmail, validatePassword } = require("../../utils/validators");
 *
 * Usage as middleware:
 *   const { validate, schemas } = require("../../utils/validators");
 *   router.post("/signup", validate(schemas.signup), controller.signup);
 */

// ─── Shared Patterns ────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const MIN_PASSWORD_LENGTH = 6;

// ─── Individual Validators ──────────────────────────────────────────────────

/**
 * Validate an email address format.
 * @param {string} email
 * @returns {{ valid: boolean, message?: string }}
 */
function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, message: "Email is required." };
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { valid: false, message: "Invalid email format." };
  }
  return { valid: true };
}

/**
 * Validate a password meets minimum requirements.
 * @param {string} password
 * @param {string} [fieldName="Password"]
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePassword(password, fieldName = "Password") {
  if (!password || typeof password !== "string") {
    return { valid: false, message: `${fieldName} is required.` };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `${fieldName} must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

/**
 * Validate a 6-digit OTP string.
 * @param {string} otp
 * @returns {{ valid: boolean, message?: string }}
 */
function validateOtp(otp) {
  if (!otp || typeof otp !== "string") {
    return { valid: false, message: "OTP is required." };
  }
  if (!OTP_REGEX.test(otp.trim())) {
    return { valid: false, message: "OTP must be a 6-digit number." };
  }
  return { valid: true };
}

/**
 * Validate that all required fields are present and non-empty.
 * @param {object} body     - req.body
 * @param {string[]} fields - List of required field names
 * @returns {{ valid: boolean, message?: string }}
 */
function validateRequiredFields(body, fields) {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return { valid: false, message: `${field} is required.` };
    }
  }
  return { valid: true };
}

// ─── Schema Definitions ─────────────────────────────────────────────────────
// Each schema is an array of validation checks to run in order.

const schemas = {
  sendSignupOtp: [
    (body) => validateEmail(body.email),
  ],

  signup: [
    (body) => validateRequiredFields(body, ["name", "email", "password", "otp"]),
    (body) => validateEmail(body.email),
    (body) => validatePassword(body.password),
    (body) => validateOtp(body.otp),
  ],

  login: [
    (body) => validateRequiredFields(body, ["email", "password"]),
    (body) => validateEmail(body.email),
  ],

  forgotPassword: [
    (body) => validateEmail(body.email),
  ],

  resetPassword: [
    (body) => validateRequiredFields(body, ["encryptedEmail", "otp", "newPassword"]),
    (body) => validatePassword(body.newPassword, "New password"),
  ],

  changePassword: [
    (body) => validateRequiredFields(body, ["encryptedEmail", "otp", "oldPassword", "newPassword"]),
    (body) => validatePassword(body.newPassword, "New password"),
  ],
};

// ─── Middleware Factory ─────────────────────────────────────────────────────

/**
 * Express middleware factory — validates req.body against a schema.
 * Returns 400 with the first validation error, or calls next().
 *
 * @param {Array<Function>} schema - Array of validator functions
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    for (const check of schema) {
      const result = check(req.body);
      if (!result.valid) {
        return res.status(400).json({ message: result.message });
      }
    }
    next();
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateOtp,
  validateRequiredFields,
  validate,
  schemas,
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
};
