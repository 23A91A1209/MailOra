/**
 * Tests for services/kafka/whatsappMessage.consumer.js — WhatsApp Kafka Consumer
 *
 * Tests consumer lifecycle: subscribe, process messages, and DLQ handling.
 * Note: The circuit breaker and retry logic create timers, so we mock them.
 */

jest.mock("axios");
jest.mock("../../config/kafka", () => ({
  createConsumer: jest.fn(),
  TOPICS: {
    WHATSAPP_MESSAGES: "whatsapp-messages",
    WHATSAPP_MESSAGES_DLQ: "whatsapp-messages-dlq",
    EMAIL_CLASSIFICATION: "email-classification",
    EMAIL_CLASSIFICATION_DLQ: "email-classification-dlq",
  },
}));
jest.mock("../../services/kafka/dlq.handler", () => ({
  sendToDLQ: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../modules/reminder/reminder.model", () => ({
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
}));
jest.mock("../../utils/circuitBreaker", () => {
  return jest.fn().mockImplementation(() => ({
    call: jest.fn((fn) => fn()),
    getState: jest.fn(() => ({ state: "CLOSED" })),
  }));
});
jest.mock("../../utils/logger", () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const axios = require("axios");
const { createConsumer } = require("../../config/kafka");
const Reminder = require("../../modules/reminder/reminder.model");

describe("WhatsApp Message Consumer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createMockConsumer(messagePayload) {
    const mockConsumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockImplementation(async ({ eachMessage }) => {
        await eachMessage({
          topic: "whatsapp-messages",
          partition: 0,
          message: { value: Buffer.from(JSON.stringify(messagePayload)) },
        });
      }),
      disconnect: jest.fn(),
    };
    createConsumer.mockReturnValue(mockConsumer);
    return mockConsumer;
  }

  it("should start consumer and subscribe to whatsapp-messages topic", async () => {
    const mockConsumer = createMockConsumer({
      reminderId: "rem123", userId: "user123", whatsappNumber: "919876543210",
      message: "Test", reminderType: "1hr", userName: "Test User", retryCount: 0,
    });
    axios.post.mockResolvedValue({ data: { success: true } });

    const { startWhatsAppMessageConsumer } = require("../../services/kafka/whatsappMessage.consumer");
    await startWhatsAppMessageConsumer();

    expect(mockConsumer.connect).toHaveBeenCalled();
    expect(mockConsumer.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "whatsapp-messages" })
    );
    expect(mockConsumer.run).toHaveBeenCalled();
  });

  it("should update reminder status to 'sent' on success", async () => {
    createMockConsumer({
      reminderId: "rem123", userId: "user123", whatsappNumber: "919876543210",
      message: "Test", reminderType: "1hr", userName: "Test User", retryCount: 0,
    });
    axios.post.mockResolvedValue({ data: { success: true } });

    const { startWhatsAppMessageConsumer } = require("../../services/kafka/whatsappMessage.consumer");
    await startWhatsAppMessageConsumer();

    expect(Reminder.findByIdAndUpdate).toHaveBeenCalledWith(
      "rem123",
      expect.objectContaining({ status: "sent" })
    );
  });

  it("should handle message parse errors gracefully", async () => {
    const mockConsumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockImplementation(async ({ eachMessage }) => {
        await eachMessage({
          topic: "whatsapp-messages",
          partition: 0,
          message: { value: Buffer.from("invalid json") },
        });
      }),
      disconnect: jest.fn(),
    };
    createConsumer.mockReturnValue(mockConsumer);

    const { startWhatsAppMessageConsumer } = require("../../services/kafka/whatsappMessage.consumer");

    // Should not throw
    await expect(startWhatsAppMessageConsumer()).resolves.not.toThrow();
  });
});
