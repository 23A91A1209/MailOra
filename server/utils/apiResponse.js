/**
 * API Response Utility — Standardized JSON Response Shapes
 *
 * Ensures consistent response formats across all API endpoints.
 * Every response follows the shape: { status, message, data?, pagination?, errors? }
 *
 * Usage:
 *   const { sendSuccess, sendPaginated, sendError } = require("../utils/apiResponse");
 *   sendSuccess(res, 200, "Profile loaded", { user });
 *   sendPaginated(res, emails, { page: 1, limit: 20, total: 100 });
 *   sendError(res, 404, "User not found");
 */

/**
 * Send a successful response.
 * @param {object} res        - Express response object
 * @param {number} statusCode - HTTP status code (200, 201, etc.)
 * @param {string} message    - Success message
 * @param {*}      [data]     - Response data payload
 */
function sendSuccess(res, statusCode, message, data = undefined) {
  const response = { status: "success", message };
  if (data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
}

/**
 * Send a paginated response.
 * @param {object} res        - Express response object
 * @param {Array}  data       - Array of results
 * @param {object} pagination - Pagination metadata { page, limit, total, totalPages }
 * @param {string} [message]  - Optional message
 */
function sendPaginated(res, data, pagination, message = "Results fetched") {
  return res.status(200).json({
    status: "success",
    message,
    data,
    pagination,
  });
}

/**
 * Send an error response.
 * @param {object} res        - Express response object
 * @param {number} statusCode - HTTP status code (400, 404, 500, etc.)
 * @param {string} message    - Error message
 * @param {*}      [errors]   - Optional error details
 */
function sendError(res, statusCode, message, errors = undefined) {
  const response = {
    status: statusCode < 500 ? "fail" : "error",
    message,
  };
  if (errors !== undefined) response.errors = errors;
  return res.status(statusCode).json(response);
}

module.exports = { sendSuccess, sendPaginated, sendError };
