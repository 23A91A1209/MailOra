/**
 * Rate Limiter Middleware — Centralized Rate Limiting Configuration
 *
 * Provides pre-configured rate limiters for different endpoint categories.
 * Prevents abuse and ensures fair usage across the API.
 *
 * Usage:
 *   const { generalLimiter, sensitiveLimiter } = require("../middlewares/rateLimiter.middleware");
 *   router.get("/me", generalLimiter, protect, controller.getProfile);
 */

const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter — for standard endpoints.
 * Allows 100 requests per 15 minutes per IP.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

/**
 * Sensitive operation rate limiter — for auth, OTP, and password endpoints.
 * Allows 10 requests per 15 minutes per IP.
 */
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    status: "fail",
    message: "Too many sensitive requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Upload rate limiter — for file upload endpoints (photos, resumes).
 * Allows 20 requests per 15 minutes per IP.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: "fail",
    message: "Too many upload requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Webhook rate limiter — for external webhook endpoints (Gmail Pub/Sub).
 * More permissive since these come from Google's servers.
 * Allows 500 requests per 5 minutes per IP.
 */
const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
  message: { status: "fail", message: "Too many webhook requests." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  sensitiveLimiter,
  uploadLimiter,
  webhookLimiter,
};
