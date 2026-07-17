/**
 * Gmail Watch Renewal Service
 *
 * Gmail Pub/Sub watch subscriptions expire after 7 days.
 * This service runs a cron job every 6 hours to check for expiring
 * subscriptions and automatically renews them before they expire.
 *
 * This prevents the system from silently losing real-time email
 * notifications when the watch subscription lapses.
 *
 * Future Enhancement (v2.1): Automated Gmail watch renewal.
 */

const cron = require("node-cron");
const ConnectedAccount = require("../modules/connectedAccount/connectedAccount.model");
const { refreshGoogleTokenIfNeeded, getGmailClient } = require("./google.service");
const logger = require("../utils/logger");

// ─── Constants ──────────────────────────────────────────────────────────────
const WATCH_EXPIRY_DAYS = 7;
const RENEWAL_BUFFER_HOURS = 24;   // Renew 24 hours before expiry
const CRON_SCHEDULE = "0 */6 * * *"; // Every 6 hours
const INITIAL_DELAY_MS = 30000;     // 30s after startup

/**
 * Renew Gmail watch for a single connected account.
 *
 * @param {object} account - ConnectedAccount document
 * @returns {boolean} true if renewed successfully
 */
async function renewWatch(account) {
  try {
    const oauthClient = await refreshGoogleTokenIfNeeded(account);
    const gmail = getGmailClient(oauthClient);

    const watchResponse = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: process.env.GOOGLE_PUBSUB_TOPIC,
        labelIds: ["INBOX"],
      },
    });

    // Update the historyId from the new watch
    account.lastHistoryId = watchResponse.data.historyId;
    account.watchExpiry = new Date(parseInt(watchResponse.data.expiration));
    await account.save();

    logger.info("WatchRenewal", `Renewed watch for ${account.emailAddress} (expires: ${account.watchExpiry.toISOString()})`);
    return true;
  } catch (err) {
    logger.error("WatchRenewal", `Failed to renew watch for ${account.emailAddress}`, err);
    return false;
  }
}

/**
 * Check all active connected accounts and renew watches that are
 * expiring within the next RENEWAL_BUFFER_HOURS.
 */
async function processWatchRenewals() {
  try {
    const renewalThreshold = new Date(
      Date.now() + RENEWAL_BUFFER_HOURS * 60 * 60 * 1000
    );

    // Find accounts that either:
    // 1. Have a watchExpiry that's within the renewal buffer
    // 2. Don't have a watchExpiry set (legacy accounts)
    const accounts = await ConnectedAccount.find({
      provider: "google",
      isActive: true,
      $or: [
        { watchExpiry: { $lt: renewalThreshold } },
        { watchExpiry: { $exists: false } },
        { watchExpiry: null },
      ],
    });

    if (accounts.length === 0) {
      logger.debug("WatchRenewal", "No watches need renewal");
      return;
    }

    logger.info("WatchRenewal", `${accounts.length} watch(es) need renewal`);

    let renewed = 0;
    let failed = 0;

    for (const account of accounts) {
      const success = await renewWatch(account);
      if (success) renewed++;
      else failed++;

      // Small delay between API calls
      await new Promise((r) => setTimeout(r, 1000));
    }

    logger.info("WatchRenewal", `Renewal complete: ${renewed} renewed, ${failed} failed`);
  } catch (err) {
    logger.error("WatchRenewal", "Watch renewal cron error", err);
  }
}

/**
 * Start the Gmail watch renewal scheduler.
 * Runs every 6 hours and once on startup (after 30-second delay).
 */
function startWatchRenewalScheduler() {
  logger.info("WatchRenewal", `Gmail watch renewal scheduler started — checking every 6 hours`);

  // Run on cron schedule
  cron.schedule(CRON_SCHEDULE, async () => {
    await processWatchRenewals();
  });

  // Initial check after startup delay (let DB + services connect first)
  setTimeout(async () => {
    try {
      logger.info("WatchRenewal", "Running initial watch renewal check...");
      await processWatchRenewals();
    } catch (err) {
      logger.error("WatchRenewal", "Initial renewal check error", err);
    }
  }, INITIAL_DELAY_MS);
}

module.exports = { startWatchRenewalScheduler, processWatchRenewals, renewWatch };
