/**
 * Kafka Client Configuration — WhatsApp Service
 *
 * Provides a Kafka client and consumer factory for the WhatsApp microservice.
 * Mirrors the main server's kafka.js pattern but scoped to this service's needs.
 */

const { Kafka, logLevel } = require("kafkajs");
const logger = require("../utils/logger");

// ─── Kafka Broker Config ────────────────────────────────────────────────────
const BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const CLIENT_ID = process.env.KAFKA_CLIENT_ID || "whatsapp-service";

const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers: BROKERS,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

// ─── Consumer Factory ───────────────────────────────────────────────────────
function createConsumer(groupId) {
  return kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxWaitTimeInMs: 5000,
  });
}

// ─── Topic Constants ────────────────────────────────────────────────────────
const TOPICS = {
  WHATSAPP_MESSAGES: "whatsapp-messages",
  WHATSAPP_MESSAGES_DLQ: "whatsapp-messages-dlq",
};

module.exports = {
  kafka,
  createConsumer,
  TOPICS,
};
