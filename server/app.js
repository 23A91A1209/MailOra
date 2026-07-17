/**
 * Express Application Configuration
 *
 * Central Express app setup including:
 * - Security middleware (Helmet, CORS, Rate Limiting)
 * - Request parsing (JSON, cookies)
 * - HTTP logging (Morgan)
 * - API v1 route mounting with versioned prefix
 * - Global error handler with AppError support
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const AppError = require("./utils/AppError");
const logger = require("./utils/logger");
const { generalLimiter, webhookLimiter } = require("./middlewares/rateLimiter.middleware");
const { getCircuitBreakerState } = require("./services/emailAI.service");

const app = express();

// ─── Security & Parsing Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// ─── CORS Configuration ────────────────────────────────────────────────────
// Origins are loaded from the ALLOWED_ORIGINS env variable (comma-separated)
// Falls back to production domain if not set.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["https://mail-or-a.dev"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ─── Health Check (not versioned — used by load balancers & monitoring) ────
app.get("/", (_req, res) => {
  res.json({
    service: "mailora-server",
    version: "2.0.0",
    status: "running",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  }[mongoState] || "unknown";

  const geminiCircuit = getCircuitBreakerState();

  const isHealthy = mongoState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    dependencies: {
      mongodb: mongoStatus,
      geminiAI: geminiCircuit,
    },
  });
});

// ─── API v1 Routes ──────────────────────────────────────────────────────────
// All API routes are prefixed with /api/v1/ for versioning.
// Legacy /api/ routes are aliased below for backward compatibility.
const v1Router = express.Router();

// Apply general rate limiting to all v1 API routes
v1Router.use(generalLimiter);

// Auth routes (have their own additional rate limiters in auth.routes.js)
v1Router.use("/auth", require("./modules/auth/auth.routes"));
v1Router.use("/auth", require("./modules/auth/socialAuth.routes"));

// Protected resource routes
v1Router.use("/user", require("./modules/user/user.routes"));
v1Router.use("/accounts", require("./modules/connectedAccount/connectedAccount.routes"));
v1Router.use("/emails", require("./modules/email/email.routes"));
v1Router.use("/jobs", require("./modules/job/job.proxy"));

// Gmail account connection (Google OAuth for email access)
v1Router.use("/", require("./modules/auth/google.routes"));

// Mount v1 routes
app.use("/api/v1", v1Router);

// ─── Backward Compatibility: /api/* → /api/v1/* ─────────────────────────────
// Existing frontends using /api/ will still work until migrated.
app.use("/api", v1Router);

// ─── Webhooks (not versioned — external services call these) ────────────────
app.use("/webhook", express.json({ limit: "1mb" }), webhookLimiter, require("./webhooks/gmail.webhook"));

// ─── 404 Handler ────────────────────────────────────────────────────────────
// Path-less middleware catches every unmatched route. Express 5 (path-to-regexp
// v8) no longer accepts a bare "*" wildcard, which is why app.all("*") crashed.
app.use((req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  // Default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log non-operational (unexpected) errors with full stack
  if (!err.isOperational) {
    logger.error("Server", "Unexpected error", err);
  }

  // Mongoose validation error → 400 with field details
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      status: "fail",
      message: "Validation failed",
      errors: messages,
    });
  }

  // Mongoose duplicate key error → 400
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(", ");
    return res.status(400).json({
      status: "fail",
      message: `Duplicate value for: ${field}`,
    });
  }

  // JWT errors → 401
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "fail",
      message: "Invalid or expired token",
    });
  }

  // Standard error response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;