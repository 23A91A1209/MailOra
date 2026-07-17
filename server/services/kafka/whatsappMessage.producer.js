/**
 * WhatsApp Message Producer
 *
 * Instead of sending WhatsApp messages directly via HTTP in the reminder scheduler,
 * this producer publishes the message to the `whatsapp-messages` Kafka topic.
 * The consumer handles delivery with retry logic and DLQ fallback.
 */

const { getProducer, TOPICS } = require("../../config/kafka");
const logger = require("../../utils/logger");

/**
 * Publish a WhatsApp message for delivery.
 *
 * @param {object} params
 * @param {string} params.reminderId       - Reminder document ObjectId
 * @param {string} params.userId           - User's ObjectId
 * @param {string} params.whatsappNumber   - Full WhatsApp number (e.g., "919876543210")
 * @param {string} params.message          - Formatted WhatsApp message text
 * @param {string} params.reminderType     - "immediate", "3days", "24hrs", "12hrs", "1hr"
 * @param {string} params.userName         - User's name (for logging)
 */
async function produceWhatsAppMessage(params) {
  const producer = await getProducer();

  await producer.send({
    topic: TOPICS.WHATSAPP_MESSAGES,
    messages: [
      {
        key: params.userId.toString(),
        value: JSON.stringify({
          ...params,
          producedAt: new Date().toISOString(),
          retryCount: 0,
        }),
      },
    ],
  });

  logger.info("Kafka", `WhatsApp message queued [${params.reminderType}] for ${params.userName}`);
}

module.exports = { produceWhatsAppMessage };
