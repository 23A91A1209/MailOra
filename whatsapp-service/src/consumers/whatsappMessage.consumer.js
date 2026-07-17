/**
 * WhatsApp Message Kafka Consumer — WhatsApp Service
 *
 * Consumes messages from the `whatsapp-messages` Kafka topic.
 * For each message, it directly invokes the local WhatsApp client
 * to send the message, eliminating the HTTP intermediary.
 *
 * This is the production-grade delivery path:
 *   Reminder Scheduler → Kafka `whatsapp-messages` → THIS CONSUMER → WhatsApp client
 *
 * Previously, the main server's consumer made HTTP calls to this service.
 * By consuming Kafka messages directly inside the WhatsApp microservice,
 * we remove the HTTP hop and improve reliability.
 */

const { createConsumer, TOPICS } = require("../config/kafka");
const { sendMessage } = require("../services/whatsappService");
const logger = require("../utils/logger");

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000; // 1s, 2s, 4s, 8s, 16s

/**
 * Process a single WhatsApp message from Kafka with retry logic.
 *
 * @param {object} messagePayload
 * @param {string} messagePayload.reminderId       - Reminder document ObjectId
 * @param {string} messagePayload.userId           - User's ObjectId
 * @param {string} messagePayload.whatsappNumber   - Full WhatsApp number (e.g., "919876543210")
 * @param {string} messagePayload.message          - Formatted WhatsApp message text
 * @param {string} messagePayload.reminderType     - "immediate", "3days", "24hrs", "12hrs", "1hr"
 * @param {string} messagePayload.userName         - User's name (for logging)
 */
async function processWhatsAppMessage(messagePayload) {
  const {
    reminderId,
    userId,
    whatsappNumber,
    message,
    reminderType,
    userName,
  } = messagePayload;

  let retryCount = messagePayload.retryCount || 0;

  while (retryCount <= MAX_RETRIES) {
    try {
      // ─── Send directly via WhatsApp client (no HTTP hop) ─────────
      const result = await sendMessage(whatsappNumber, message);

      if (result.success) {
        logger.info(
          "KafkaConsumer",
          `WhatsApp sent [${reminderType}] to ${userName} (${whatsappNumber})`
        );
        return; // Success
      } else {
        // sendMessage returned success: false (e.g., not registered on WhatsApp)
        throw new Error(result.error || "WhatsApp sendMessage returned failure");
      }
    } catch (err) {
      retryCount++;

      if (retryCount > MAX_RETRIES) {
        logger.error(
          "KafkaConsumer",
          `Max retries (${MAX_RETRIES}) for WhatsApp [${reminderType}] to ${userName}: ${err.message}`
        );
        // Message is dropped after max retries — main server DLQ handles persistence
        return;
      }

      // Exponential backoff
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, retryCount - 1);
      logger.warn(
        "KafkaConsumer",
        `WhatsApp retry ${retryCount}/${MAX_RETRIES} in ${backoffMs}ms — ${err.message}`
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
}

/**
 * Start the WhatsApp message Kafka consumer.
 * Subscribes to the `whatsapp-messages` topic and processes messages.
 *
 * @returns {object} Kafka consumer instance (for graceful shutdown)
 */
async function startWhatsAppConsumer() {
  const consumer = createConsumer("whatsapp-service-group");

  await consumer.connect();
  await consumer.subscribe({
    topic: TOPICS.WHATSAPP_MESSAGES,
    fromBeginning: false,
  });

  logger.info("Kafka", "WhatsApp message consumer started");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        logger.debug(
          "KafkaConsumer",
          `Received message [${payload.reminderType}] for ${payload.userName}`
        );
        await processWhatsAppMessage(payload);
      } catch (err) {
        logger.error("KafkaConsumer", "Message parse/process error", err);
      }
    },
  });

  return consumer;
}

module.exports = { startWhatsAppConsumer, processWhatsAppMessage };
