/**
 * Structured Logger Utility
 *
 * Provides consistent, structured logging across the entire server.
 * Replaces raw console.log/error calls with tagged, timestamped output.
 *
 * Usage:
 *   const logger = require("./utils/logger");
 *   logger.info("Kafka", "Consumer started");
 *   logger.error("Auth", "Login failed", error);
 *
 * Each log entry includes:
 *   - ISO timestamp
 *   - Log level (INFO, WARN, ERROR, DEBUG)
 *   - Component tag (e.g., "Kafka", "Auth", "Webhook")
 *   - Message
 *   - Optional error details
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Default to INFO in production, DEBUG in development
const currentLevel =
  LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ??
  (process.env.NODE_ENV === "production" ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

/**
 * Format a log entry as a structured string.
 * @param {string} level  - Log level label
 * @param {string} tag    - Component tag (e.g., "Kafka", "Auth")
 * @param {string} msg    - Log message
 * @param {*}      [meta] - Optional metadata or error object
 * @returns {string}
 */
function formatEntry(level, tag, msg, meta) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] [${tag}] ${msg}`;
  if (meta instanceof Error) {
    return `${base}\n  → ${meta.message}\n  ${meta.stack || ""}`;
  }
  if (meta !== undefined) {
    return `${base} ${typeof meta === "string" ? meta : JSON.stringify(meta)}`;
  }
  return base;
}

const logger = {
  /**
   * Log informational message.
   * @param {string} tag  - Component tag
   * @param {string} msg  - Message
   * @param {*}      [meta] - Optional metadata
   */
  info(tag, msg, meta) {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(formatEntry("INFO", tag, msg, meta));
    }
  },

  /**
   * Log warning message.
   * @param {string} tag  - Component tag
   * @param {string} msg  - Message
   * @param {*}      [meta] - Optional metadata
   */
  warn(tag, msg, meta) {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatEntry("WARN", tag, msg, meta));
    }
  },

  /**
   * Log error message.
   * @param {string} tag  - Component tag
   * @param {string} msg  - Message
   * @param {*}      [meta] - Optional error or metadata
   */
  error(tag, msg, meta) {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(formatEntry("ERROR", tag, msg, meta));
    }
  },

  /**
   * Log debug message (suppressed in production by default).
   * @param {string} tag  - Component tag
   * @param {string} msg  - Message
   * @param {*}      [meta] - Optional metadata
   */
  debug(tag, msg, meta) {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.debug(formatEntry("DEBUG", tag, msg, meta));
    }
  },
};

module.exports = logger;
