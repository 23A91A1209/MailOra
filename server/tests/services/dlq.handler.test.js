/**
 * Tests for services/kafka/dlq.handler.js — Dead Letter Queue handler
 */

// Mock dependencies
jest.mock("../../config/kafka", () => ({
  getProducer: jest.fn(),
  TOPICS: {
    EMAIL_CLASSIFICATION: "email-classification",
    EMAIL_CLASSIFICATION_DLQ: "email-classification-dlq",
    WHATSAPP_MESSAGES: "whatsapp-messages",
    WHATSAPP_MESSAGES_DLQ: "whatsapp-messages-dlq",
  },
}));

jest.mock("../../modules/failedMessage/failedMessage.model", () => ({
  create: jest.fn(),
}));

jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { sendToDLQ } = require("../../services/kafka/dlq.handler");
const { getProducer, TOPICS } = require("../../config/kafka");
const FailedMessage = require("../../modules/failedMessage/failedMessage.model");

describe("DLQ handler — sendToDLQ()", () => {
  const mockSend = jest.fn().mockResolvedValue({});
  const mockProducer = { send: mockSend };

  beforeEach(() => {
    jest.clearAllMocks();
    getProducer.mockResolvedValue(mockProducer);
    FailedMessage.create.mockResolvedValue({});
  });

  it("should publish to email-classification DLQ topic", async () => {
    const payload = { userId: "user123", subject: "Test" };

    await sendToDLQ(TOPICS.EMAIL_CLASSIFICATION, payload, "Some error", 5);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: TOPICS.EMAIL_CLASSIFICATION_DLQ,
      })
    );
  });

  it("should publish to whatsapp-messages DLQ topic", async () => {
    const payload = { userId: "user123" };

    await sendToDLQ(TOPICS.WHATSAPP_MESSAGES, payload, "Send failed", 3);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: TOPICS.WHATSAPP_MESSAGES_DLQ,
      })
    );
  });

  it("should persist failure in MongoDB", async () => {
    const payload = { userId: "user123", subject: "Test email" };

    await sendToDLQ(TOPICS.EMAIL_CLASSIFICATION, payload, "AI error", 5);

    expect(FailedMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: TOPICS.EMAIL_CLASSIFICATION,
        payload,
        lastError: "AI error",
        retryCount: 5,
        userId: "user123",
      })
    );
  });

  it("should include failure metadata in Kafka message", async () => {
    const payload = { userId: "user123" };

    await sendToDLQ(TOPICS.EMAIL_CLASSIFICATION, payload, "timeout", 3);

    const sentMessage = JSON.parse(mockSend.mock.calls[0][0].messages[0].value);
    expect(sentMessage).toHaveProperty("originalTopic", TOPICS.EMAIL_CLASSIFICATION);
    expect(sentMessage).toHaveProperty("error", "timeout");
    expect(sentMessage).toHaveProperty("retryCount", 3);
    expect(sentMessage).toHaveProperty("failedAt");
  });

  it("should handle Kafka producer failure gracefully", async () => {
    getProducer.mockRejectedValue(new Error("Kafka down"));

    // Should not throw — logs error instead
    await expect(
      sendToDLQ(TOPICS.EMAIL_CLASSIFICATION, { userId: "u" }, "err", 1)
    ).resolves.not.toThrow();
  });

  it("should handle MongoDB failure gracefully", async () => {
    FailedMessage.create.mockRejectedValue(new Error("DB down"));

    // Should not throw
    await expect(
      sendToDLQ(TOPICS.EMAIL_CLASSIFICATION, { userId: "u" }, "err", 1)
    ).resolves.not.toThrow();
  });

  it("should use 'unknown' as key when userId is missing", async () => {
    await sendToDLQ(TOPICS.EMAIL_CLASSIFICATION, {}, "error", 1);

    const sentKey = mockSend.mock.calls[0][0].messages[0].key;
    expect(sentKey).toBe("unknown");
  });
});
