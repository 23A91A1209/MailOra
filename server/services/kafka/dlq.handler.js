/**
 * Dead Letter Queue Handler
 *
 * When a message fails after all retry attempts, this handler:
 * 1. Publishes the message to the DLQ Kafka topic
 * 2. Persists the failure in MongoDB for admin review
 */

const { getProducer, TOPICS } = require("../../config/kafka");
const FailedMessage = require("../../modules/failedMessage/failedMessage.model");
const logger = require("../../utils/logger");

/**
 * Send a failed message to the dead-letter queue.
 *
 * @param {string} originalTopic - The topic the message originally came from
 * @param {object} payload       - The original message payload
 * @param {string} error         - The final error message
 * @param {number} retryCount    - How many times it was retried
 */
async function sendToDLQ(originalTopic, payload, error, retryCount) {
  const dlqTopic = originalTopic === TOPICS.EMAIL_CLASSIFICATION
    ? TOPICS.EMAIL_CLASSIFICATION_DLQ
    : TOPICS.WHATSAPP_MESSAGES_DLQ;

  try {
    // 1. Publish to DLQ Kafka topic
    const producer = await getProducer();
    await producer.send({
      topic: dlqTopic,
      messages: [
        {
          key: payload.userId || "unknown",
          value: JSON.stringify({
            originalTopic,
            payload,
            error,
            retryCount,
            failedAt: new Date().toISOString(),
          }),
        },
      ],
    });

    // 2. Persist in MongoDB
    await FailedMessage.create({
      topic: originalTopic,
      payload,
      lastError: error,
      retryCount,
      userId: payload.userId || null,
    });

    logger.error("DLQ", `Message sent to ${dlqTopic} after ${retryCount} retries: ${error}`);
  } catch (dlqErr) {
    // If even the DLQ write fails, log to stderr as last resort
    logger.error("DLQ", "CRITICAL — Failed to write to DLQ", dlqErr);
    logger.error("DLQ", "Original payload", JSON.stringify(payload));
  }
}

module.exports = { sendToDLQ };
