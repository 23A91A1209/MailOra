/**
 * Gmail Sync Service (automatic backfill)
 *
 * The primary email-ingestion path is push-based: Gmail `watch` → Google Pub/Sub
 * → POST /webhook → publish to Kafka. But a push can be MISSED before it ever
 * reaches Kafka — e.g. the server was down when Google pushed, the `watch`
 * subscription lapsed, or the Gmail history cursor expired. Kafka cannot recover
 * those, because they never reached Kafka.
 *
 * This service is the safety net: a low-frequency reconciliation that re-fetches
 * recent inbox activity per connected account and publishes anything new to the
 * same Kafka `email-classification` topic. It replaces the old user-triggered
 * "manual sync" button with a fully automatic backfill.
 *
 * NOTE: this is a genuine reconciliation poll (there is no event to push it), so
 * a cron is the correct tool here — unrelated to the reminder system, which is
 * deliberately push-based (see reminderQueue.service.js).
 */

const cron = require("node-cron");
const ConnectedAccount = require("../modules/connectedAccount/connectedAccount.model");
const { refreshGoogleTokenIfNeeded, getGmailClient } = require("./google.service");
const { extractBody } = require("../utils/emailParser");
const { produceEmailForClassification } = require("./kafka/emailClassification.producer");
const logger = require("../utils/logger");

// Every 20 minutes; first run 30s after startup (let DB + Kafka connect).
const CRON_SCHEDULE = "*/20 * * * *";
const INITIAL_DELAY_MS = 30000;
const RECENT_MESSAGES_LIMIT = 20;
const PER_ACCOUNT_DELAY_MS = 1000;

/**
 * Fetch one Gmail message, extract its fields, and publish it to Kafka for
 * async AI classification. Returns "queued" | "error".
 */
async function processMessage(gmail, messageId, account) {
  try {
    const fullMessage = await gmail.users.messages.get({ userId: "me", id: messageId });

    const headers = fullMessage.data.payload.headers;
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const snippet = fullMessage.data.snippet || "";
    const emailBody = extractBody(fullMessage.data.payload, snippet);

    await produceEmailForClassification({
      userId: account.userId.toString(),
      connectedAccountId: account._id.toString(),
      provider: "google",
      messageId,
      subject,
      from,
      snippet,
      body: emailBody,
      internalDate: fullMessage.data.internalDate,
    });

    logger.info("GmailSync", `Queued for classification: ${subject.substring(0, 60)}`);
    return "queued";
  } catch (err) {
    logger.error("GmailSync", "Process message error", err);
    return "error";
  }
}

/**
 * Fallback path: fetch the most recent INBOX messages and process them.
 * Used on first sync or when the history cursor has expired.
 */
async function syncRecentMessages(gmail, account) {
  let queued = 0;
  let skipped = 0;

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["INBOX"],
    maxResults: RECENT_MESSAGES_LIMIT,
  });

  if (!listResponse.data.messages) {
    return { queued: 0, skipped: 0 };
  }

  for (const msg of listResponse.data.messages) {
    const result = await processMessage(gmail, msg.id, account);
    if (result === "queued") queued++;
    else skipped++;
  }

  // Advance the cursor to "now" from the profile.
  const profile = await gmail.users.getProfile({ userId: "me" });
  account.lastHistoryId = profile.data.historyId;
  await account.save();

  return { queued, skipped };
}

/**
 * Sync a single connected Gmail account.
 * History-based when possible; falls back to recent messages if the cursor is
 * missing or expired. Returns { queued, skipped }.
 */
async function syncGmailAccount(account) {
  const oauthClient = await refreshGoogleTokenIfNeeded(account);
  const gmail = getGmailClient(oauthClient);

  let queued = 0;
  let skipped = 0;

  if (account.lastHistoryId) {
    try {
      const historyResponse = await gmail.users.history.list({
        userId: "me",
        startHistoryId: account.lastHistoryId,
        historyTypes: ["messageAdded"],
      });

      if (historyResponse.data.history) {
        for (const record of historyResponse.data.history) {
          if (!record.messagesAdded) continue;
          for (const msgObj of record.messagesAdded) {
            const msg = msgObj.message;
            if (!msg.labelIds || !msg.labelIds.includes("INBOX")) continue;
            const result = await processMessage(gmail, msg.id, account);
            if (result === "queued") queued++;
            else skipped++;
          }
        }
      }

      if (historyResponse.data.historyId) {
        account.lastHistoryId = historyResponse.data.historyId;
        await account.save();
      }
    } catch (histErr) {
      // History cursor too old/expired → fall back to recent messages.
      if (histErr.code === 404 || histErr.message?.includes("historyId")) {
        logger.warn("GmailSync", `History expired for ${account.emailAddress}, falling back to recent messages`);
        const result = await syncRecentMessages(gmail, account);
        queued = result.queued;
        skipped = result.skipped;
      } else {
        throw histErr;
      }
    }
  } else {
    // No cursor yet (e.g. first backfill) → fetch recent messages.
    const result = await syncRecentMessages(gmail, account);
    queued = result.queued;
    skipped = result.skipped;
  }

  return { queued, skipped };
}

/**
 * Backfill every active Google account. Failures are isolated per-account.
 */
async function syncAllActiveAccounts() {
  const accounts = await ConnectedAccount.find({ provider: "google", isActive: true });

  if (accounts.length === 0) {
    logger.debug("GmailSync", "No active accounts to backfill");
    return { accounts: 0, queued: 0 };
  }

  let totalQueued = 0;
  for (const account of accounts) {
    try {
      const { queued } = await syncGmailAccount(account);
      totalQueued += queued;
    } catch (err) {
      logger.error("GmailSync", `Backfill failed for ${account.emailAddress}`, err);
    }
    // Small delay to be gentle on the Gmail API.
    await new Promise((r) => setTimeout(r, PER_ACCOUNT_DELAY_MS));
  }

  logger.info("GmailSync", `Backfill complete: ${totalQueued} email(s) queued across ${accounts.length} account(s)`);
  return { accounts: accounts.length, queued: totalQueued };
}

/**
 * Start the automatic backfill scheduler. Runs every 20 minutes and once on
 * startup (after a short delay).
 */
function startAutoSyncScheduler() {
  logger.info("GmailSync", "Auto-sync backfill scheduler started — every 20 minutes");

  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await syncAllActiveAccounts();
    } catch (err) {
      logger.error("GmailSync", "Auto-sync cron error", err);
    }
  });

  setTimeout(async () => {
    try {
      logger.info("GmailSync", "Running initial backfill...");
      await syncAllActiveAccounts();
    } catch (err) {
      logger.error("GmailSync", "Initial backfill error", err);
    }
  }, INITIAL_DELAY_MS);
}

module.exports = {
  startAutoSyncScheduler,
  syncAllActiveAccounts,
  syncGmailAccount,
  syncRecentMessages,
  processMessage,
};
