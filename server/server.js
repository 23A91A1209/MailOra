/**
 * Server Entry Point
 *
 * Initializes the database connection, Kafka consumers, and
 * the WhatsApp reminder cron scheduler. Includes graceful
 * shutdown handling for production reliability.
 */

require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./utils/logger");
const { startReminderWorker, stopReminderWorker } = require("./services/reminderWorker.service");
const { reconcilePendingReminders, closeReminderQueue } = require("./services/reminderQueue.service");
const { startWatchRenewalScheduler } = require("./services/watchRenewal.service");
const { startAutoSyncScheduler } = require("./services/gmailSync.service");
const { ensureTopics, TOPICS, disconnectKafka } = require("./config/kafka");
const { startEmailClassificationConsumer } = require("./services/kafka/emailClassification.consumer");
const { startWhatsAppMessageConsumer } = require("./services/kafka/whatsappMessage.consumer");
const { disconnectRedis } = require("./config/redis");
const mongoose = require("mongoose");

// ─── Global Error Safety Net ────────────────────────────────────────────────

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Process", "Unhandled Rejection", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Process", "Uncaught Exception — shutting down", error);
  process.exit(1);
});

// ─── Kafka Consumer References (for graceful shutdown) ──────────────────────
let emailConsumer = null;
let whatsappConsumer = null;

// ─── Boot Sequence ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

(async () => {
  // Ensure database is connected BEFORE accepting HTTP traffic
  await connectDB();

  const server = global.__server = app.listen(PORT, async () => {
    logger.info("Server", `Mailora server v2.0.0 running on port ${PORT}`);

  // ─── Kafka Setup ────────────────────────────────────────────
  try {
    await ensureTopics([
      TOPICS.EMAIL_CLASSIFICATION,
      TOPICS.EMAIL_CLASSIFICATION_DLQ,
      TOPICS.WHATSAPP_MESSAGES,
      TOPICS.WHATSAPP_MESSAGES_DLQ,
    ]);

    emailConsumer = await startEmailClassificationConsumer();
    whatsappConsumer = await startWhatsAppMessageConsumer();

    logger.info("Kafka", "All Kafka consumers are running");
  } catch (kafkaErr) {
    logger.error("Kafka", "Kafka setup failed — server running WITHOUT Kafka", kafkaErr);
  }

  // Start the BullMQ reminder worker (processes delayed jobs — no polling).
  startReminderWorker();

  // Durability backstop: re-enqueue any still-pending reminders that lack a
  // live job (legacy reminders, jobs added while down, or a flushed Redis).
  // One bounded scan at boot — not a recurring poll. Delay lets DB/Redis connect.
  setTimeout(async () => {
    try {
      logger.info("ReminderQueue", "Reconciling pending reminders on startup...");
      await reconcilePendingReminders();
    } catch (err) {
      logger.error("ReminderQueue", "Startup reconcile error", err);
    }
  }, 10000);

  // Start Gmail watch renewal cron (checks every 6 hours — v2.1 enhancement)
  startWatchRenewalScheduler();

  // Start Gmail auto-sync backfill (every 20 min — catches any push the webhook
  // missed during downtime / watch lapse / history expiry). Replaces manual sync.
  startAutoSyncScheduler();
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────

  /**
   * Gracefully shut down all connections and resources.
   * Triggered by SIGTERM (Docker/K8s) or SIGINT (Ctrl+C).
   *
   * Shutdown order:
   *   1. Stop accepting new HTTP connections
   *   2. Disconnect Kafka consumers (stop processing messages)
   *   3. Disconnect Kafka producer
   *   4. Stop the reminder worker + queue (BullMQ)
   *   5. Disconnect Redis
   *   6. Close MongoDB connection
   *   7. Exit process
   */
  async function gracefulShutdown(signal) {
    logger.info("Server", `${signal} received — starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(() => {
      logger.info("Server", "HTTP server closed");
    });

    try {
      // 2. Disconnect Kafka consumers
      if (emailConsumer) {
        await emailConsumer.disconnect();
        logger.info("Kafka", "Email classification consumer disconnected");
      }
      if (whatsappConsumer) {
        await whatsappConsumer.disconnect();
        logger.info("Kafka", "WhatsApp message consumer disconnected");
      }

      // 3. Disconnect Kafka producer
      await disconnectKafka();
      logger.info("Kafka", "Producer disconnected");

      // 4. Stop the reminder worker + queue (finishes in-flight jobs)
      await stopReminderWorker();
      await closeReminderQueue();

      // 5. Disconnect Redis
      await disconnectRedis();

      // 6. Close MongoDB
      await mongoose.connection.close();
      logger.info("MongoDB", "Connection closed");

      logger.info("Server", "Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error("Server", "Error during shutdown", err);
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
})();
