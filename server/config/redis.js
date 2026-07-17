/**
 * Redis Configuration
 *
 * Provides shared ioredis connections used by:
 *   - BullMQ reminder queue + worker (delayed-job scheduling)
 *   - (future) rate-limit store sharing across instances
 *
 * BullMQ requires `maxRetriesPerRequest: null` on its connections, and a
 * Worker must NOT share a connection with the Queue because it issues blocking
 * commands (BRPOPLPUSH). We therefore expose:
 *   - getRedisConnection()    → a lazily-created shared connection (Queue, general use)
 *   - createRedisConnection() → a fresh connection (each Worker gets its own)
 *
 * Set REDIS_URL in .env (e.g. redis://localhost:6379). Defaults to localhost.
 */

const Redis = require("ioredis");
const logger = require("../utils/logger");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Build a new ioredis connection configured for BullMQ.
 */
function createRedisConnection(label = "Redis") {
  const conn = new Redis(REDIS_URL, {
    // BullMQ requirement — blocking commands must never give up.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  conn.on("connect", () => logger.info(label, "Connected"));
  conn.on("error", (err) => logger.error(label, `Connection error: ${err.message}`));

  return conn;
}

// ─── Shared connection (singleton) ──────────────────────────────────────────
let _connection = null;

function getRedisConnection() {
  if (!_connection) {
    _connection = createRedisConnection("Redis");
  }
  return _connection;
}

/**
 * Close the shared connection (used during graceful shutdown).
 */
async function disconnectRedis() {
  if (_connection) {
    await _connection.quit();
    _connection = null;
    logger.info("Redis", "Shared connection closed");
  }
}

module.exports = {
  getRedisConnection,
  createRedisConnection,
  disconnectRedis,
};