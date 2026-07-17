/**
 * Reminder Worker Service (BullMQ)
 *
 * Consumes delayed jobs from the "reminders" queue. Each job fires at exactly
 * its reminder's scheduledAt time (no polling). For each job it:
 *   1. Loads the Reminder (source of truth) + the user.
 *   2. Validates the user still wants/can receive a WhatsApp reminder.
 *   3. Formats the message and publishes it to the Kafka `whatsapp-messages`
 *      topic — the existing consumer handles delivery with retry + DLQ.
 *   4. Marks the Reminder "queued".
 *
 * Replaces the old node-cron scheduler in reminderScheduler.service.js.
 */

const { Worker } = require("bullmq");
const { createRedisConnection } = require("../config/redis");
const { QUEUE_NAME } = require("./reminderQueue.service");
const Reminder = require("../modules/reminder/reminder.model");
const User = require("../modules/user/user.model");
const { produceWhatsAppMessage } = require("./kafka/whatsappMessage.producer");
const logger = require("../utils/logger");

/**
 * Format a WhatsApp reminder message.
 */
function formatReminderMessage(reminder) {
  const deadline = new Date(reminder.deadlineDate);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.round((deadline - now) / (60 * 60 * 1000)));
  const daysLeft = Math.floor(hoursLeft / 24);
  const remainingHours = hoursLeft % 24;

  let urgencyEmoji = "📋";
  let urgencyLabel = "";

  switch (reminder.reminderType) {
    case "immediate":
      urgencyEmoji = "🚨";
      urgencyLabel = "URGENT — Deadline approaching fast!";
      break;
    case "1hr":
      urgencyEmoji = "⏰";
      urgencyLabel = "FINAL REMINDER — Only ~1 hour left!";
      break;
    case "12hrs":
      urgencyEmoji = "⚠️";
      urgencyLabel = "Reminder — ~12 hours remaining";
      break;
    case "24hrs":
      urgencyEmoji = "📌";
      urgencyLabel = "Follow-up — ~2 days remaining";
      break;
    case "3days":
      urgencyEmoji = "🔔";
      urgencyLabel = "Heads-up — 3 days until deadline";
      break;
  }

  let timeLeftStr = "";
  if (daysLeft > 0) {
    timeLeftStr = `${daysLeft}d ${remainingHours}h`;
  } else {
    timeLeftStr = `${remainingHours}h`;
  }

  const categoryIcon = {
    job: "💼",
    internship: "🎓",
    hackathon: "🏆",
    workshop: "🛠️",
  }[reminder.emailCategory] || "📧";

  const lines = [
    `${urgencyEmoji} *Mail-or-a Deadline Reminder*`,
    ``,
    `${urgencyLabel}`,
    ``,
    `${categoryIcon} *Category:* ${(reminder.emailCategory || "").toUpperCase()}`,
    `📄 *Subject:* ${reminder.emailSubject}`,
    `⏳ *Deadline:* ${deadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    `⏱️ *Time Left:* ${timeLeftStr}`,
  ];

  if (reminder.emailMatter) {
    lines.push(``, `💡 *Summary:* ${reminder.emailMatter}`);
  }

  lines.push(
    ``,
    `—`,
    `_Open Mail-or-a to take action before it's too late!_`
  );

  return lines.join("\n");
}

/**
 * Process a single reminder job. Mirrors the per-reminder logic that used to
 * live in the cron's processDueReminders() loop.
 */
async function processReminderJob(job) {
  const { reminderId } = job.data;

  const reminder = await Reminder.findById(reminderId);
  if (!reminder) {
    logger.warn("ReminderWorker", `Reminder ${reminderId} not found — skipping`);
    return;
  }

  // Idempotency guard: only act on reminders that are still pending. If a
  // duplicate job somehow runs, the second one finds status !== "pending".
  if (reminder.status !== "pending") {
    logger.debug("ReminderWorker", `Reminder ${reminderId} already "${reminder.status}" — skipping`);
    return;
  }

  // Look up the user's verified mobile number + preferences.
  const user = await User.findById(reminder.userId).select(
    "name countryCode mobileNumber isMobileVerified reminderPreferences"
  );

  if (!user) {
    reminder.status = "skipped";
    reminder.failReason = "User not found";
    await reminder.save();
    return;
  }

  if (user.reminderPreferences && user.reminderPreferences.whatsapp === false) {
    reminder.status = "skipped";
    reminder.failReason = "User disabled WhatsApp reminders";
    await reminder.save();
    return;
  }

  if (!user.isMobileVerified || !user.mobileNumber) {
    reminder.status = "skipped";
    reminder.failReason = "Mobile not verified";
    await reminder.save();
    return;
  }

  // Build WhatsApp number (strip "+" from country code) and the message.
  const whatsappNumber = `${user.countryCode.replace("+", "")}${user.mobileNumber}`;
  const message = formatReminderMessage(reminder);

  // Publish to Kafka — the existing consumer handles delivery + retry + DLQ.
  await produceWhatsAppMessage({
    reminderId: reminder._id.toString(),
    userId: reminder.userId.toString(),
    whatsappNumber,
    message,
    reminderType: reminder.reminderType,
    userName: user.name,
  });

  reminder.status = "queued";
  await reminder.save();

  logger.info("ReminderWorker", `Queued [${reminder.reminderType}] for ${user.name} (${whatsappNumber})`);
}

let _worker = null;

/**
 * Start the BullMQ reminder worker. Safe to call once per process.
 * Concurrency is configurable via REMINDER_WORKER_CONCURRENCY (default 10).
 */
function startReminderWorker() {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE_NAME, processReminderJob, {
    connection: createRedisConnection("ReminderWorker"), // worker needs its own connection
    concurrency: parseInt(process.env.REMINDER_WORKER_CONCURRENCY || "10", 10),
  });

  _worker.on("failed", (job, err) => {
    logger.error("ReminderWorker", `Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
  });
  _worker.on("error", (err) => {
    logger.error("ReminderWorker", `Worker error: ${err.message}`);
  });

  logger.info("ReminderWorker", "Reminder worker started — BullMQ delayed jobs (no polling)");
  return _worker;
}

/**
 * Stop the worker (graceful shutdown).
 */
async function stopReminderWorker() {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info("ReminderWorker", "Worker stopped");
  }
}

module.exports = {
  startReminderWorker,
  stopReminderWorker,
  processReminderJob,
  formatReminderMessage,
};
