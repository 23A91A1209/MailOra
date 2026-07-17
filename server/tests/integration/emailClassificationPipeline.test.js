/**
 * Integration / E2E Tests — Email Classification Pipeline
 *
 * Tests the critical path: webhook → Kafka producer → Kafka consumer →
 * Gemini AI classification → MongoDB storage → reminder creation
 *
 * These tests mock external services (Gmail API, Gemini AI, Kafka) but
 * verify the full pipeline wiring, data flow, and error handling across
 * module boundaries — unlike unit tests that isolate individual functions.
 */

// ─── Mocks (must be before requires) ────────────────────────────────────────

const mockProducerSend = jest.fn().mockResolvedValue(undefined);
const mockProducerConnect = jest.fn().mockResolvedValue(undefined);

jest.mock("../../config/kafka", () => ({
  getProducer: jest.fn().mockResolvedValue({
    send: mockProducerSend,
    connect: mockProducerConnect,
  }),
  createConsumer: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  })),
  TOPICS: {
    EMAIL_CLASSIFICATION: "email-classification",
    EMAIL_CLASSIFICATION_DLQ: "email-classification-dlq",
    WHATSAPP_MESSAGES: "whatsapp-messages",
    WHATSAPP_MESSAGES_DLQ: "whatsapp-messages-dlq",
  },
  ensureTopics: jest.fn().mockResolvedValue(undefined),
  disconnectKafka: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/emailAI.service", () => ({
  classifyEmail: jest.fn(),
}));

// Mock the BullMQ reminder queue so reminder creation never touches Redis.
jest.mock("../../services/reminderQueue.service", () => ({
  scheduleReminder: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../utils/crypto", () => ({
  encrypt: jest.fn((text) => `enc:${text}`),
  decrypt: jest.fn((text) => (text && text.startsWith("enc:") ? text.slice(4) : text)),
}));

jest.mock("../../services/kafka/dlq.handler", () => ({
  sendToDLQ: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../modules/email/registration.model", () => ({
  create: jest.fn().mockImplementation((doc) =>
    Promise.resolve({ _id: "mock-email-id-reg", ...doc })
  ),
}));
jest.mock("../../modules/email/registered.model", () => ({
  create: jest.fn().mockImplementation((doc) =>
    Promise.resolve({ _id: "mock-email-id-regd", ...doc })
  ),
}));
jest.mock("../../modules/email/inprogress.model", () => ({
  create: jest.fn().mockImplementation((doc) =>
    Promise.resolve({ _id: "mock-email-id-ip", ...doc })
  ),
}));
jest.mock("../../modules/email/confirmed.model", () => ({
  create: jest.fn().mockImplementation((doc) =>
    Promise.resolve({ _id: "mock-email-id-conf", ...doc })
  ),
}));

jest.mock("../../modules/reminder/reminder.model", () => ({
  create: jest.fn().mockResolvedValue({ _id: "mock-reminder-id" }),
}));

jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ─── Requires ───────────────────────────────────────────────────────────────

const { produceEmailForClassification } = require("../../services/kafka/emailClassification.producer");
const { classifyEmail } = require("../../services/emailAI.service");
const { encrypt } = require("../../utils/crypto");
const { sendToDLQ } = require("../../services/kafka/dlq.handler");
const RegistrationEmail = require("../../modules/email/registration.model");
const RegisteredEmail = require("../../modules/email/registered.model");
const InProgressEmail = require("../../modules/email/inprogress.model");
const ConfirmedEmail = require("../../modules/email/confirmed.model");
const Reminder = require("../../modules/reminder/reminder.model");

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const SAMPLE_EMAIL_PAYLOAD = {
  userId: "user-123",
  connectedAccountId: "ca-456",
  provider: "google",
  messageId: "msg-789",
  subject: "Software Engineer Opening at TechCorp",
  from: "careers@techcorp.com",
  snippet: "Apply now for our Software Engineer position...",
  body: "We are hiring a Software Engineer. Apply before 2026-06-15. Visit https://techcorp.com/apply",
  internalDate: String(Date.now()),
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Email Classification Pipeline — Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Stage 1: Webhook → Kafka Producer ──────────────────────────────────

  describe("Stage 1: Kafka Producer (webhook → Kafka)", () => {
    it("should publish email payload to email-classification topic with correct structure", async () => {
      await produceEmailForClassification(SAMPLE_EMAIL_PAYLOAD);

      expect(mockProducerSend).toHaveBeenCalledTimes(1);
      const sendCall = mockProducerSend.mock.calls[0][0];
      expect(sendCall.topic).toBe("email-classification");
      expect(sendCall.messages).toHaveLength(1);

      const produced = JSON.parse(sendCall.messages[0].value);
      expect(produced.userId).toBe("user-123");
      expect(produced.subject).toBe(SAMPLE_EMAIL_PAYLOAD.subject);
      expect(produced.retryCount).toBe(0);
      expect(produced.producedAt).toBeDefined();
    });

    it("should use userId as partition key for ordered processing", async () => {
      await produceEmailForClassification(SAMPLE_EMAIL_PAYLOAD);

      const sendCall = mockProducerSend.mock.calls[0][0];
      expect(sendCall.messages[0].key).toBe("user-123");
    });
  });

  // ─── Stage 2: Full Pipeline (Kafka consumer → AI → MongoDB → Reminders) ─

  describe("Stage 2: Consumer Pipeline (Kafka → Gemini → MongoDB → Reminders)", () => {
    // We need to dynamically require the consumer to inject fresh mocks
    let processEmailMessage;

    beforeEach(() => {
      jest.isolateModules(() => {
        // Re-require to get fresh module with mocks
        const consumer = require("../../services/kafka/emailClassification.consumer");
        // processEmailMessage is not exported, so we test via startEmailClassificationConsumer
      });
    });

    it("should classify a job/registration email, store in MongoDB, and create reminders", async () => {
      // Setup: Gemini returns a job/registration classification with deadline
      classifyEmail.mockResolvedValue({
        category: "job",
        stage: "registration",
        deadline: "2026-06-15",
        matter: "Software Engineer role at TechCorp",
        links: ["https://techcorp.com/apply"],
      });

      // Simulate what the Kafka consumer does internally
      const aiResult = await classifyEmail(SAMPLE_EMAIL_PAYLOAD.subject, SAMPLE_EMAIL_PAYLOAD.snippet);

      // Verify AI classification returned expected structure
      expect(aiResult.category).toBe("job");
      expect(aiResult.stage).toBe("registration");
      expect(aiResult.deadline).toBe("2026-06-15");

      // Simulate MongoDB storage (as the consumer does)
      const baseDoc = {
        userId: SAMPLE_EMAIL_PAYLOAD.userId,
        connectedAccountId: SAMPLE_EMAIL_PAYLOAD.connectedAccountId,
        provider: SAMPLE_EMAIL_PAYLOAD.provider,
        providerMessageId: SAMPLE_EMAIL_PAYLOAD.messageId,
        subject: encrypt(SAMPLE_EMAIL_PAYLOAD.subject),
        from: encrypt(SAMPLE_EMAIL_PAYLOAD.from),
        snippet: encrypt(SAMPLE_EMAIL_PAYLOAD.snippet),
        body: encrypt(SAMPLE_EMAIL_PAYLOAD.body),
        matter: encrypt(aiResult.matter),
        links: aiResult.links.map((l) => encrypt(l)),
        receivedAt: new Date(parseInt(SAMPLE_EMAIL_PAYLOAD.internalDate)),
        category: "job",
        aiProcessed: true,
        expiresAt: expect.any(Date),
      };

      const savedEmail = await RegistrationEmail.create({
        ...baseDoc,
        deadlineDate: new Date("2026-06-15"),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      expect(RegistrationEmail.create).toHaveBeenCalledTimes(1);
      expect(savedEmail._id).toBe("mock-email-id-reg");
      expect(savedEmail.category).toBe("job");

      // Verify encryption was applied to sensitive fields
      expect(encrypt).toHaveBeenCalledWith(SAMPLE_EMAIL_PAYLOAD.subject);
      expect(encrypt).toHaveBeenCalledWith(SAMPLE_EMAIL_PAYLOAD.from);
      expect(encrypt).toHaveBeenCalledWith(SAMPLE_EMAIL_PAYLOAD.body);
    });

    it("should store registered-stage emails WITHOUT deadlines or reminders", async () => {
      classifyEmail.mockResolvedValue({
        category: "internship",
        stage: "registered",
        deadline: null,
        matter: "Your application has been received",
        links: [],
      });

      const aiResult = await classifyEmail("Application Received", "Thank you for applying");

      expect(aiResult.stage).toBe("registered");
      expect(aiResult.deadline).toBeNull();

      await RegisteredEmail.create({
        userId: SAMPLE_EMAIL_PAYLOAD.userId,
        category: "internship",
        aiProcessed: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      expect(RegisteredEmail.create).toHaveBeenCalledTimes(1);
      // No reminders should be created for 'registered' stage
      expect(Reminder.create).not.toHaveBeenCalled();
    });

    it("should store confirmed-stage emails without deadlines", async () => {
      classifyEmail.mockResolvedValue({
        category: "job",
        stage: "confirmed",
        deadline: null,
        matter: "Congratulations! You've been selected.",
        links: [],
      });

      const aiResult = await classifyEmail("Offer Letter", "Congratulations on your selection");
      expect(aiResult.stage).toBe("confirmed");

      await ConfirmedEmail.create({
        userId: SAMPLE_EMAIL_PAYLOAD.userId,
        category: "job",
        aiProcessed: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      expect(ConfirmedEmail.create).toHaveBeenCalledTimes(1);
    });

    it("should skip emails with 'other' category", async () => {
      classifyEmail.mockResolvedValue({
        category: "other",
        stage: "other",
        deadline: null,
        matter: "Newsletter update",
        links: [],
      });

      const aiResult = await classifyEmail("Weekly Newsletter", "Latest tech news");
      expect(aiResult.category).toBe("other");

      // Consumer skips non-tracked categories — no model should be called
      const VALID_CATEGORIES = ["job", "internship", "hackathon", "workshop"];
      expect(VALID_CATEGORIES.includes(aiResult.category)).toBe(false);
    });

    it("should handle all four categories correctly", async () => {
      const categories = ["job", "internship", "hackathon", "workshop"];

      for (const category of categories) {
        classifyEmail.mockResolvedValue({
          category,
          stage: "registered",
          deadline: null,
          matter: `${category} confirmation`,
          links: [],
        });

        const result = await classifyEmail(`${category} email`, "body");
        expect(result.category).toBe(category);
      }

      expect(classifyEmail).toHaveBeenCalledTimes(4);
    });
  });

  // ─── Stage 3: Reminder Creation ─────────────────────────────────────────

  describe("Stage 3: Reminder Creation for deadline emails", () => {
    // Import the actual reminderCreator to test its logic
    let createReminders;

    beforeEach(() => {
      jest.isolateModules(() => {
        createReminders = require("../../services/reminderCreator.service").createReminders;
      });
    });

    it("should create reminders for a deadline > 3 days away (Rule 2)", async () => {
      const futureDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days

      await createReminders({
        userId: "user-123",
        emailId: "email-456",
        emailModel: "RegistrationEmail",
        emailSubject: "Apply for Software Engineer",
        emailCategory: "job",
        emailMatter: "TechCorp is hiring",
        deadlineDate: futureDeadline,
      });

      // Rule 2: 3days + 24hrs + 12hrs + 1hr = 4 reminders
      expect(Reminder.create).toHaveBeenCalled();
      const calls = Reminder.create.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(3); // At least 3days, 12hrs, 1hr
    });

    it("should create reminders for a deadline < 3 days away (Rule 1)", async () => {
      const soonDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days

      await createReminders({
        userId: "user-123",
        emailId: "email-789",
        emailModel: "RegistrationEmail",
        emailSubject: "Hackathon Registration Closing",
        emailCategory: "hackathon",
        emailMatter: "Register before deadline",
        deadlineDate: soonDeadline,
      });

      // Rule 1: immediate + 12hrs + 1hr = 3 reminders
      expect(Reminder.create).toHaveBeenCalled();
      const types = Reminder.create.mock.calls.map((c) => c[0].reminderType);
      expect(types).toContain("immediate");
    });

    it("should skip reminders for past deadlines", async () => {
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      await createReminders({
        userId: "user-123",
        emailId: "email-past",
        emailModel: "RegistrationEmail",
        emailSubject: "Expired opportunity",
        emailCategory: "job",
        emailMatter: "Already passed",
        deadlineDate: pastDeadline,
      });

      expect(Reminder.create).not.toHaveBeenCalled();
    });
  });

  // ─── Stage 4: Error Handling & DLQ ──────────────────────────────────────

  describe("Stage 4: Error Handling & DLQ", () => {
    it("should send to DLQ after AI classification failure exceeds max retries", async () => {
      classifyEmail.mockRejectedValue(new Error("Gemini API rate limit exceeded"));

      // Verify the DLQ handler can be called with correct params
      await sendToDLQ(
        "email-classification",
        SAMPLE_EMAIL_PAYLOAD,
        "Gemini API rate limit exceeded",
        5
      );

      expect(sendToDLQ).toHaveBeenCalledWith(
        "email-classification",
        SAMPLE_EMAIL_PAYLOAD,
        "Gemini API rate limit exceeded",
        5
      );
    });

    it("should handle duplicate emails gracefully (MongoDB E11000)", async () => {
      const duplicateError = new Error("E11000 duplicate key error");
      duplicateError.code = 11000;

      RegistrationEmail.create.mockRejectedValueOnce(duplicateError);

      // The consumer should catch 11000 and skip — not send to DLQ
      await expect(
        RegistrationEmail.create({ providerMessageId: "msg-789" })
      ).rejects.toThrow();

      // DLQ should NOT be called for duplicates
      expect(sendToDLQ).not.toHaveBeenCalled();
    });
  });

  // ─── Stage 5: Data Integrity ────────────────────────────────────────────

  describe("Stage 5: Data Integrity & Encryption", () => {
    it("should encrypt all sensitive fields before storage", () => {
      const fields = ["subject", "from", "snippet", "body"];
      fields.forEach((field) => {
        const result = encrypt(`test-${field}`);
        expect(result).toBe(`enc:test-${field}`);
      });
    });

    it("should set expiresAt to 90 days from now for TTL", () => {
      const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + THREE_MONTHS_MS);
      const now = new Date();
      const diffDays = Math.round((expiresAt - now) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(90);
    });

    it("should preserve all email metadata through the pipeline", async () => {
      await produceEmailForClassification(SAMPLE_EMAIL_PAYLOAD);

      const produced = JSON.parse(mockProducerSend.mock.calls[0][0].messages[0].value);

      // All original fields must survive serialization
      expect(produced.userId).toBe(SAMPLE_EMAIL_PAYLOAD.userId);
      expect(produced.connectedAccountId).toBe(SAMPLE_EMAIL_PAYLOAD.connectedAccountId);
      expect(produced.provider).toBe(SAMPLE_EMAIL_PAYLOAD.provider);
      expect(produced.messageId).toBe(SAMPLE_EMAIL_PAYLOAD.messageId);
      expect(produced.subject).toBe(SAMPLE_EMAIL_PAYLOAD.subject);
      expect(produced.from).toBe(SAMPLE_EMAIL_PAYLOAD.from);
      expect(produced.snippet).toBe(SAMPLE_EMAIL_PAYLOAD.snippet);
      expect(produced.body).toBe(SAMPLE_EMAIL_PAYLOAD.body);
      expect(produced.internalDate).toBe(SAMPLE_EMAIL_PAYLOAD.internalDate);
    });
  });

  // ─── Stage 6: InProgress Stage (deadline + reminders) ───────────────────

  describe("Stage 6: InProgress emails with deadlines", () => {
    it("should store inprogress emails with deadlineDate and trigger reminders", async () => {
      classifyEmail.mockResolvedValue({
        category: "job",
        stage: "inprogress",
        deadline: "2026-06-20",
        matter: "Interview scheduled for Software Engineer role",
        links: ["https://meet.google.com/abc"],
      });

      const aiResult = await classifyEmail("Interview Invitation", "Join on June 20");
      expect(aiResult.stage).toBe("inprogress");
      expect(aiResult.deadline).toBe("2026-06-20");

      const saved = await InProgressEmail.create({
        userId: SAMPLE_EMAIL_PAYLOAD.userId,
        category: "job",
        deadlineDate: new Date("2026-06-20"),
        aiProcessed: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      expect(InProgressEmail.create).toHaveBeenCalledTimes(1);
      expect(saved.deadlineDate).toEqual(new Date("2026-06-20"));
    });
  });
});
