const express = require("express");
const cors = require("cors");
const messageRoutes = require("./routes/messageRoutes");
const logger = require("./utils/logger");

// ─── Express App Setup ──────────────────────────────────────────────────────
const app = express();

// CORS — only allow the main backend server to call this service
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["https://server.mail-or-a.dev"];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Parse JSON request bodies
app.use(express.json());

// Mount routes
app.use("/api", messageRoutes);

// Health check is also available at root /health (outside /api prefix)
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "WhatsApp Service is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("App", "Unhandled error", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

module.exports = app;
