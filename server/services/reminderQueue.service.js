/**
 * Reminder Queue Service (BullMQ — Redis-backed delayed jobs)
 *
 * Replaces the old "poll Mongo every 5 minutes" cron scheduler.
 *
 * Instead of repeatedly scanning the database for due reminders, each reminder
 * is scheduled ONCE at creation time as a *delayed* BullMQ job that fires at
 * exactly its `scheduledAt`. Redis holds the delay; the worker
 * (reminderWorker.service.js) processes the job when it becomes due.
 *
 * Why this scales better than the cron:
 *   - No constant polling load on Mongo.
 *   - Horizontally scalable: run N workers; Redis hands each job to exactly one
 *     worker, so there are no duplicate WhatsApp sends.
 *   - Fires on time (no up-to-5-minute lag).
 *
 * Idempotency: jobId === reminderId. Adding the same reminder twice is a no-op,
 * which also lets us cancel a reminder later via cancelReminder().
 */

const { Queue } = require("bullmq");
const { getRedisConnection } = require("../config/redis");
const Reminder = require("../modules/reminder/reminder.model");
const logger = require("../utils/logger");

const QUEUE_NAME = "reminders";

let _queue = null;

/**
 * Lazily create the shared reminders Queue.
 * (Lazy so that simply requiring this module never opens a Redis connection —
 *  important for unit tests and for code paths that only create reminders.)
 */
function getReminderQueue() {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        // Keep a bounded history for observability, then auto-prune.
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
    logger.info("ReminderQueue", `BullMQ queue "${QUEUE_NAME}" initialized`);
  }
  return _queue;
}

/**
 * Schedule a single reminder to fire at its scheduledAt time.
 *
 * @param {object} params
 * @param {string|object} params.reminderId - Reminder document _id
 * @param {Date|string}   params.scheduledAt - When the reminder should fire
 */
async function scheduleReminder({ reminderId, scheduledAt } = {}) {
  if (!reminderId) return; // nothing to schedule (e.g. duplicate that wasn't created)

  const id = reminderId.toString();
  const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());

  await getReminderQueue().add(
    "send-reminder",
    { reminderId: id },
    {
      jobId: id, // idempotent: same reminder never enqueued twice
      delay,
    }
  );

  logger.debug(
    "ReminderQueue",
    `Scheduled reminder ${id} to fire in ${Math.round(delay / 1000)}s`
  );
}

/**
 * Cancel a previously-scheduled reminder (e.g. user acted on the email).
 */
async function cancelReminder(reminderId) {
  if (!reminderId) return;
  try {
    const job = await getReminderQueue().getJob(reminderId.toString());
    if (job) {
      await job.remove();
      logger.debug("ReminderQueue", `Cancelled reminder ${reminderId}`);
    }
  } catch (err) {
    logger.warn("ReminderQueue", `Failed to cancel reminder ${reminderId}: ${err.message}`);
  }
}

/**
 * Durability backstop — re-enqueue every still-pending reminder.
 *
 * Run once on startup. Because jobIds are deterministic (= reminderId), any
 * reminder that already has a live job is skipped automatically. This covers:
 *   - reminders created before this migration,
 *   - reminders created while no worker/Redis was available,
 *   - a flushed/restarted Redis instance.
 *
 * This is a single bounded scan at boot — NOT a recurring poll.
 */
async function reconcilePendingReminders() {
  const pending = await Reminder.find({ status: "pending" })
    .select("_id scheduledAt")
    .lean();

  if (pending.length === 0) {
    logger.info("ReminderQueue", "Reconcile: no pending reminders to schedule");
    return 0;
  }

  let scheduled = 0;
  for (const r of pending) {
    try {
      await scheduleReminder({ reminderId: r._id, scheduledAt: r.scheduledAt });
      scheduled++;
    } catch (err) {
      logger.error("ReminderQueue", `Reconcile failed for reminder ${r._id}`, err);
    }
  }

  logger.info("ReminderQueue", `Reconcile: scheduled ${scheduled}/${pending.length} pending reminder(s)`);
  return scheduled;
}

/**
 * Close the queue (graceful shutdown).
 */
async function closeReminderQueue() {
  if (_queue) {
    await _queue.close();
    _queue = null;
    logger.info("ReminderQueue", "Queue closed");
  }
}

module.exports = {
  QUEUE_NAME,
  getReminderQueue,
  scheduleReminder,
  cancelReminder,
  reconcilePendingReminders,
  closeReminderQueue,
};
