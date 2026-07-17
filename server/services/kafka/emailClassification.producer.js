/**
 * Email Classification Producer
 *
 * Instead of calling Gemini AI inline (which can fail/timeout),
 * this producer publishes raw email data to the `email-classification` Kafka topic.
 * The consumer picks it up, classifies with Gemini, and stores the result.
 *
 * This decouples the Gmail webhook/sync flow from Gemini API availability.
 */

const { getProducer, TOPICS } = require("../../config/kafka");
const logger = require("../../utils/logger");

/**
 * Publish an email for AI classification.
 *
 * @param {object} params
 * @param {string} params.userId             - User's ObjectId
 * @param {string} params.connectedAccountId - Connected account's ObjectId
 * @param {string} params.provider           - "google" or "microsoft"
 * @param {string} params.messageId          - Provider message ID (Gmail msg ID)
 * @param {string} params.subject            - Email subject (plaintext)
 * @param {string} params.from               - Sender address (plaintext)
 * @param {string} params.snippet            - Email snippet (plaintext)
 * @param {string} params.body               - Full email body (plaintext)
 * @param {string} params.internalDate       - Gmail internalDate (epoch ms string)
 */
async function produceEmailForClassification(params) {
  const producer = await getProducer();

  await producer.send({
    topic: TOPICS.EMAIL_CLASSIFICATION,
    messages: [
      {
        // Partition key = userId so all of a user's emails go to the same partition
        key: params.userId.toString(),
        value: JSON.stringify({
          ...params,
          producedAt: new Date().toISOString(),
          retryCount: 0,
        }),
      },
    ],
  });

  logger.info("Kafka", `Email queued for classification: ${params.subject?.substring(0, 50)}`);
}

module.exports = { produceEmailForClassification };
