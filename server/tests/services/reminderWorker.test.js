/**
 * Tests for services/reminderWorker.service.js — BullMQ reminder processing.
 *
 * Covers processReminderJob() branch logic (the per-reminder work that used to
 * live in the cron's processDueReminders loop) and formatReminderMessage().
 */

// ─── Mocks (must be before requires) ────────────────────────────────────────

// Avoid loading the real BullMQ queue / Redis / ioredis.
jest.mock("../../services/reminderQueue.service", () => ({ QUEUE_NAME: "reminders" }));
jest.mock("../../config/redis", () => ({ createRedisConnection: jest.fn() }));

jest.mock("../../modules/reminder/reminder.model", () => ({
  findById: jest.fn(),
}));
jest.mock("../../modules/user/user.model", () => ({
  findById: jest.fn(),
}));
jest.mock("../../services/kafka/whatsappMessage.producer", () => ({
  produceWhatsAppMessage: jest.fn().mockResolvedValue(undefined),
}));

const Reminder = require("../../modules/reminder/reminder.model");
const User = require("../../modules/user/user.model");
const { produceWhatsAppMessage } = require("../../services/kafka/whatsappMessage.producer");
const {
  processReminderJob,
  formatReminderMessage,
} = require("../../services/reminderWorker.service");

// Helpers to build chainable mongoose-ish mocks.
function buildReminder(overrides = {}) {
  return {
    _id: "rem-1",
    userId: "user-1",
    status: "pending",
    reminderType: "1hr",
    emailSubject: "Apply now",
    emailCategory: "job",
    emailMatter: "TechCorp hiring",
    deadlineDate: new Date(Date.now() + 60 * 60 * 1000),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function mockUserSelect(user) {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
}

const job = { data: { reminderId: "rem-1" } };

describe("reminderWorker — processReminderJob", () => {
  beforeEach(() => jest.clearAllMocks());

  it("skips when the reminder no longer exists", async () => {
    Reminder.findById.mockResolvedValue(null);

    await processReminderJob(job);

    expect(produceWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("skips (idempotent) when the reminder is already processed", async () => {
    Reminder.findById.mockResolvedValue(buildReminder({ status: "queued" }));

    await processReminderJob(job);

    expect(produceWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("marks skipped when the user is not found", async () => {
    const reminder = buildReminder();
    Reminder.findById.mockResolvedValue(reminder);
    mockUserSelect(null);

    await processReminderJob(job);

    expect(reminder.status).toBe("skipped");
    expect(reminder.failReason).toBe("User not found");
    expect(reminder.save).toHaveBeenCalled();
    expect(produceWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("marks skipped when the user disabled WhatsApp reminders", async () => {
    const reminder = buildReminder();
    Reminder.findById.mockResolvedValue(reminder);
    mockUserSelect({
      name: "Asha",
      countryCode: "+91",
      mobileNumber: "9876543210",
      isMobileVerified: true,
      reminderPreferences: { whatsapp: false },
    });

    await processReminderJob(job);

    expect(reminder.status).toBe("skipped");
    expect(produceWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("marks skipped when the mobile number is not verified", async () => {
    const reminder = buildReminder();
    Reminder.findById.mockResolvedValue(reminder);
    mockUserSelect({
      name: "Asha",
      countryCode: "+91",
      mobileNumber: "9876543210",
      isMobileVerified: false,
    });

    await processReminderJob(job);

    expect(reminder.status).toBe("skipped");
    expect(produceWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("produces a WhatsApp message and marks queued on the happy path", async () => {
    const reminder = buildReminder();
    Reminder.findById.mockResolvedValue(reminder);
    mockUserSelect({
      name: "Asha",
      countryCode: "+91",
      mobileNumber: "9876543210",
      isMobileVerified: true,
      reminderPreferences: { whatsapp: true },
    });

    await processReminderJob(job);

    expect(produceWhatsAppMessage).toHaveBeenCalledTimes(1);
    const payload = produceWhatsAppMessage.mock.calls[0][0];
    expect(payload.whatsappNumber).toBe("919876543210"); // "+" stripped, concatenated
    expect(payload.reminderType).toBe("1hr");
    expect(payload.message).toContain("Mail-or-a Deadline Reminder");

    expect(reminder.status).toBe("queued");
    expect(reminder.save).toHaveBeenCalled();
  });
});

describe("reminderWorker — formatReminderMessage", () => {
  it("includes subject, category and summary", () => {
    const msg = formatReminderMessage(buildReminder({ reminderType: "12hrs" }));
    expect(msg).toContain("Apply now");
    expect(msg).toContain("JOB");
    expect(msg).toContain("TechCorp hiring");
  });
});
