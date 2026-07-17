/**
 * Tests for services/kafka/emailClassification.producer.js — Kafka producer
 */

jest.mock("../../config/kafka", () => ({
  getProducer: jest.fn(),
  TOPICS: {
    EMAIL_CLASSIFICATION: "email-classification",
  },
}));

jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { produceEmailForClassification } = require("../../services/kafka/emailClassification.producer");
const { getProducer, TOPICS } = require("../../config/kafka");

describe("emailClassification producer", () => {
  const mockSend = jest.fn().mockResolvedValue({});
  const mockProducer = { send: mockSend };

  beforeEach(() => {
    jest.clearAllMocks();
    getProducer.mockResolvedValue(mockProducer);
  });

  it("should publish to email-classification topic", async () => {
    await produceEmailForClassification({
      userId: "user123",
      connectedAccountId: "acc456",
      provider: "google",
      messageId: "msg789",
      subject: "Test Subject",
      from: "sender@example.com",
      snippet: "Preview text",
      body: "Full body",
      internalDate: "1234567890",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].topic).toBe(TOPICS.EMAIL_CLASSIFICATION);
  });

  it("should use userId as partition key", async () => {
    await produceEmailForClassification({
      userId: "user123",
      subject: "Test",
    });

    const key = mockSend.mock.calls[0][0].messages[0].key;
    expect(key).toBe("user123");
  });

  it("should include producedAt timestamp and retryCount in message", async () => {
    await produceEmailForClassification({
      userId: "user123",
      subject: "Test",
    });

    const payload = JSON.parse(mockSend.mock.calls[0][0].messages[0].value);
    expect(payload).toHaveProperty("producedAt");
    expect(payload.retryCount).toBe(0);
  });

  it("should include all email fields in the payload", async () => {
    const params = {
      userId: "u1",
      connectedAccountId: "ca1",
      provider: "google",
      messageId: "m1",
      subject: "Sub",
      from: "from@test.com",
      snippet: "Snip",
      body: "Body",
      internalDate: "12345",
    };

    await produceEmailForClassification(params);

    const payload = JSON.parse(mockSend.mock.calls[0][0].messages[0].value);
    expect(payload.userId).toBe("u1");
    expect(payload.connectedAccountId).toBe("ca1");
    expect(payload.provider).toBe("google");
    expect(payload.messageId).toBe("m1");
    expect(payload.subject).toBe("Sub");
    expect(payload.from).toBe("from@test.com");
    expect(payload.snippet).toBe("Snip");
    expect(payload.body).toBe("Body");
    expect(payload.internalDate).toBe("12345");
  });
});
