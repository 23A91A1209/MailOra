/**
 * Tests for services/reminderCreator.service.js — Reminder scheduling rules
 */

// Mock the Reminder model before requiring the service
jest.mock("../../modules/reminder/reminder.model", () => ({
  create: jest.fn().mockResolvedValue({ _id: "rem-1", scheduledAt: new Date() }),
}));

// Mock the BullMQ queue so the unit test never touches Redis.
jest.mock("../../services/reminderQueue.service", () => ({
  scheduleReminder: jest.fn().mockResolvedValue(undefined),
}));

const { createReminders } = require("../../services/reminderCreator.service");
const Reminder = require("../../modules/reminder/reminder.model");
const { scheduleReminder } = require("../../services/reminderQueue.service");

describe("reminderCreator service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseParams = {
    userId: "user123",
    emailId: "email456",
    emailModel: "RegistrationEmail",
    emailSubject: "Apply for Software Engineer",
    emailCategory: "job",
    emailMatter: "Great opportunity at Google",
  };

  // ─── Past Deadline ─────────────────────────────────────────────
  it("should skip reminders when deadline is in the past", async () => {
    await createReminders({
      ...baseParams,
      deadlineDate: new Date(Date.now() - 60000), // 1 min ago
    });

    expect(Reminder.create).not.toHaveBeenCalled();
  });

  // ─── Deadline < 3 Days Away (Rule 1) ──────────────────────────
  it("should create immediate + 12hrs + 1hr reminders when deadline < 3 days away", async () => {
    const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

    await createReminders({
      ...baseParams,
      deadlineDate: deadline,
    });

    // Should create 3 reminders: immediate, 12hrs, 1hr
    expect(Reminder.create).toHaveBeenCalledTimes(3);

    const calls = Reminder.create.mock.calls.map((c) => c[0].reminderType);
    expect(calls).toContain("immediate");
    expect(calls).toContain("12hrs");
    expect(calls).toContain("1hr");
  });

  // ─── Delayed-job Scheduling ───────────────────────────────────
  it("should schedule a BullMQ delayed job for each created reminder", async () => {
    const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

    await createReminders({ ...baseParams, deadlineDate: deadline });

    // Rule 1 creates 3 reminders → 3 scheduled jobs
    expect(scheduleReminder).toHaveBeenCalledTimes(3);
    expect(scheduleReminder).toHaveBeenCalledWith(
      expect.objectContaining({ reminderId: "rem-1" })
    );
  });

  it("should not schedule a job for a duplicate reminder (create rejects 11000)", async () => {
    const duplicateError = new Error("Duplicate key");
    duplicateError.code = 11000;
    Reminder.create.mockRejectedValue(duplicateError);

    const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await createReminders({ ...baseParams, deadlineDate: deadline });

    expect(scheduleReminder).not.toHaveBeenCalled();
  });

  // ─── Deadline >= 3 Days Away (Rule 2) ─────────────────────────
  it("should create 3days + 24hrs + 12hrs + 1hr reminders when deadline >= 3 days away", async () => {
    const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

    await createReminders({
      ...baseParams,
      deadlineDate: deadline,
    });

    // Should create 4 reminders: 3days, 24hrs, 12hrs, 1hr
    expect(Reminder.create).toHaveBeenCalledTimes(4);

    const calls = Reminder.create.mock.calls.map((c) => c[0].reminderType);
    expect(calls).toContain("3days");
    expect(calls).toContain("24hrs");
    expect(calls).toContain("12hrs");
    expect(calls).toContain("1hr");
  });

  // ─── Duplicate Handling ────────────────────────────────────────
  it("should skip duplicates silently (MongoDB error code 11000)", async () => {
    const duplicateError = new Error("Duplicate key");
    duplicateError.code = 11000;
    Reminder.create.mockRejectedValue(duplicateError);

    const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    // Should not throw
    await expect(
      createReminders({ ...baseParams, deadlineDate: deadline })
    ).resolves.not.toThrow();
  });

  // ─── Correct scheduledAt Values ────────────────────────────────
  it("should set immediate reminder scheduledAt to approximately now", async () => {
    const deadline = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day from now

    await createReminders({ ...baseParams, deadlineDate: deadline });

    const immediateCall = Reminder.create.mock.calls.find(
      (c) => c[0].reminderType === "immediate"
    );
    expect(immediateCall).toBeDefined();

    const scheduledAt = new Date(immediateCall[0].scheduledAt);
    const now = new Date();
    // Should be within 5 seconds of now
    expect(Math.abs(scheduledAt - now)).toBeLessThan(5000);
  });
});
