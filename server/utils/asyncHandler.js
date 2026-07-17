/**
 * Async Handler — Eliminates repetitive try/catch in route handlers.
 *
 * Wraps an async Express route handler and catches any rejected promise,
 * forwarding the error to the global error handler via next().
 *
 * Usage:
 *   const asyncHandler = require("../../utils/asyncHandler");
 *   router.get("/me", protect, asyncHandler(async (req, res) => { ... }));
 */

const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
