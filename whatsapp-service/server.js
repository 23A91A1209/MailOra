require("dotenv").config();

const app = require("./src/app");
const client = require("./src/config/whatsapp");
const { startWhatsAppConsumer } = require("./src/consumers/whatsappMessage.consumer");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 3000;

// ─── Boot Sequence ──────────────────────────────────────────────────────────
// 1. Initialize WhatsApp client FIRST
// 2. Start Express server only AFTER WhatsApp is ready
// 3. Start Kafka consumer for the whatsapp-messages topic

logger.info("Boot", "Starting WhatsApp Service...");

client.initialize();

client.once("ready", async () => {
  // WhatsApp is connected → start the HTTP server
  app.listen(PORT, () => {
    logger.info("Boot", `API server running on http://localhost:${PORT}`);
    logger.info("Boot", "  POST /api/send       → Send single message");
    logger.info("Boot", "  POST /api/send-bulk  → Send bulk messages");
    logger.info("Boot", "  GET  /health         → Health check");
  });

  // Start Kafka consumer for reminder delivery pipeline
  try {
    const consumer = await startWhatsAppConsumer();
    logger.info("Boot", "Kafka consumer started — listening on whatsapp-messages topic");

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info("Boot", `${signal} received — shutting down...`);
      try {
        await consumer.disconnect();
        logger.info("Boot", "Kafka consumer disconnected");
      } catch (err) {
        logger.error("Boot", "Error disconnecting Kafka consumer", err);
      }
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.warn("Boot", "Kafka consumer failed to start (service will run HTTP-only mode)", err);
  }
});
