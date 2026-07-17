/**
 * AppError — Structured Application Error Class
 *
 * Extends the built-in Error with HTTP status codes and operational flags.
 * Used throughout the application to throw meaningful errors that the
 * global error handler can format into proper HTTP responses.
 *
 * Usage:
 *   const AppError = require("../utils/AppError");
 *   throw new AppError("Email already in use", 400);
 *   throw new AppError("User not found", 404);
 *
 * The global error handler in app.js detects AppError instances and returns:
 *   { status: "fail", message: "Email already in use" }
 */

class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error message
   * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
   */
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    // Capture stack trace, excluding this constructor from the trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
