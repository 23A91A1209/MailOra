/**
 * Kafka Client Configuration
 *
 * Provides a singleton Kafka client, shared producer, and consumer factory.
 * Uses KafkaJS with automatic topic creation and retry defaults.
 */

const { Kafka, logLevel } = require("kafkajs");
const logger = require("../utils/logger");

// ─── Kafka Broker Config ────────────────────────────────────────────────────
const BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const CLIENT_ID = process.env.KAFKA_CLIENT_ID || "mail-or-a-server";

const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers: BROKERS,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

// ─── Shared Producer (singleton) ────────────────────────────────────────────
let _producer = null;

async function getProducer() {
  if (!_producer) {
    _producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    await _producer.connect();
    logger.info("Kafka", "Producer connected");
  }
  return _producer;
}

// ─── Consumer Factory ───────────────────────────────────────────────────────
function createConsumer(groupId) {
  return kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxWaitTimeInMs: 5000,
  });
}

// ─── Admin (for topic creation if needed) ───────────────────────────────────
async function ensureTopics(topicNames) {
  const admin = kafka.admin();
  await admin.connect();
  try {
    const existingTopics = await admin.listTopics();
    const toCreate = topicNames.filter((t) => !existingTopics.includes(t));
    if (toCreate.length > 0) {
      await admin.createTopics({
        topics: toCreate.map((topic) => ({
          topic,
          numPartitions: 3,
          replicationFactor: 1,
        })),
      });
      logger.info("Kafka", `Topics created: ${toCreate.join(", ")}`);
    }
  } finally {
    await admin.disconnect();
  }
}

// ─── Topic Constants ────────────────────────────────────────────────────────
const TOPICS = {
  EMAIL_CLASSIFICATION: "email-classification",
  EMAIL_CLASSIFICATION_DLQ: "email-classification-dlq",
  WHATSAPP_MESSAGES: "whatsapp-messages",
  WHATSAPP_MESSAGES_DLQ: "whatsapp-messages-dlq",
};

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
async function disconnectKafka() {
  if (_producer) {
    await _producer.disconnect();
    _producer = null;
    logger.info("Kafka", "Producer disconnected");
  }
}

module.exports = {
  kafka,
  getProducer,
  createConsumer,
  ensureTopics,
  disconnectKafka,
  TOPICS,
};
