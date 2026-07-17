/**
 * Joi Validation Schemas — Centralized Request Body Validation
 *
 * Uses Joi library for robust, declarative input validation.
 * Each schema defines the exact shape and constraints of expected request bodies.
 *
 * Usage as middleware:
 *   const { validateBody, joiSchemas } = require("../../utils/joiSchemas");
 *   router.post("/login", validateBody(joiSchemas.login), controller.login);
 *
 * This module complements the existing `validators.js` utility functions
 * with Joi's richer validation features (nested objects, arrays, patterns).
 */

const Joi = require("joi");

// ─── Shared field definitions ───────────────────────────────────────────────

const email = Joi.string().email().lowercase().trim().required()
  .messages({
    "string.email": "Invalid email format.",
    "any.required": "Email is required.",
    "string.empty": "Email cannot be empty.",
  });

const password = Joi.string().min(6).max(128).required()
  .messages({
    "string.min": "Password must be at least 6 characters.",
    "any.required": "Password is required.",
    "string.empty": "Password cannot be empty.",
  });

const otp = Joi.string().pattern(/^\d{6}$/).required()
  .messages({
    "string.pattern.base": "OTP must be a 6-digit number.",
    "any.required": "OTP is required.",
    "string.empty": "OTP cannot be empty.",
  });

const name = Joi.string().trim().min(1).max(100).required()
  .messages({
    "any.required": "Name is required.",
    "string.empty": "Name cannot be empty.",
    "string.max": "Name cannot exceed 100 characters.",
  });

// ─── Schemas ────────────────────────────────────────────────────────────────

const joiSchemas = {
  // Auth
  sendSignupOtp: Joi.object({ email }),

  signup: Joi.object({
    name,
    email,
    password,
    otp,
  }),

  login: Joi.object({
    email,
    password,
  }),

  forgotPassword: Joi.object({ email }),

  resetPassword: Joi.object({
    encryptedEmail: Joi.string().required().messages({
      "any.required": "Encrypted email parameter is required.",
    }),
    otp,
    newPassword: password,
  }),

  changePassword: Joi.object({
    encryptedEmail: Joi.string().required(),
    otp,
    oldPassword: password,
    newPassword: password,
  }),

  // User profile
  updateBasicInfo: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    countryCode: Joi.string().pattern(/^\+\d{1,4}$/).optional()
      .messages({ "string.pattern.base": "Country code must be in format +XX or +XXX." }),
    mobileNumber: Joi.string().pattern(/^\d{6,15}$/).optional()
      .messages({ "string.pattern.base": "Mobile number must be 6-15 digits." }),
    email: Joi.string().email().lowercase().optional(),
    role: Joi.string().trim().max(100).optional(),
  }),

  updateSection: Joi.object({
    data: Joi.alternatives().try(
      Joi.string(),
      Joi.array(),
      Joi.object()
    ).required().messages({
      "any.required": "Section data is required.",
    }),
  }),

  sendMobileOtp: Joi.object({
    countryCode: Joi.string().pattern(/^\+\d{1,4}$/).required()
      .messages({
        "string.pattern.base": "Country code must be in format +XX.",
        "any.required": "Country code is required.",
      }),
    mobileNumber: Joi.string().pattern(/^\d{6,15}$/).required()
      .messages({
        "string.pattern.base": "Mobile number must be 6-15 digits.",
        "any.required": "Mobile number is required.",
      }),
  }),

  verifyMobileOtp: Joi.object({
    otp,
  }),

  changeProfilePassword: Joi.object({
    current: Joi.string().required().messages({ "any.required": "Current password is required." }),
    new: password,
    confirm: Joi.string().valid(Joi.ref("new")).required()
      .messages({
        "any.only": "Passwords do not match.",
        "any.required": "Password confirmation is required.",
      }),
  }),
};

// ─── Middleware Factory ─────────────────────────────────────────────────────

/**
 * Express middleware factory — validates req.body against a Joi schema.
 * Returns 400 with the first validation error, or calls next().
 *
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,     // Stop on first error
      stripUnknown: true,   // Remove fields not in schema
      convert: true,        // Type coercion (e.g., string→number)
    });

    if (error) {
      const message = error.details[0].message.replace(/"/g, "");
      return res.status(400).json({
        status: "fail",
        message,
      });
    }

    // Replace req.body with sanitized/coerced values
    req.body = value;
    next();
  };
}

module.exports = { joiSchemas, validateBody };
