/**
 * FailedMessage Model — Dead Letter Queue persistence
 *
 * Stores messages that exhausted all retry attempts in Kafka consumers.
 * Allows manual review, re-processing, or admin intervention.
 */

const mongoose = require("mongoose");

const failedMessageSchema = new mongoose.Schema(
  {
    // Which Kafka topic this message came from
    topic: {
      type: String,
      required: true,
      enum: [
        "email-classification",
        "whatsapp-messages",
        "email-classification-dlq",
        "whatsapp-messages-dlq",
      ],
      index: true,
    },

    // The original message payload (JSON string)
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Error that caused the final failure
    lastError: {
      type: String,
      default: "",
    },

    // How many times it was retried before being sent to DLQ
    retryCount: {
      type: Number,
      default: 0,
    },

    // Whether an admin has manually resolved this
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Optional: which user this relates to
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    resolvedAt: Date,
    resolvedBy: String,
  },
  { timestamps: true }
);

// Auto-expire unresolved DLQ entries after 30 days
failedMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { resolved: false } }
);

module.exports = mongoose.model("FailedMessage", failedMessageSchema);
