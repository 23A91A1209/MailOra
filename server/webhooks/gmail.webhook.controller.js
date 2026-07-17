// webhooks/gmail.webhook.controller.js
//
// Refactored to use Kafka for fault-tolerant email classification.
// Instead of calling Gemini AI inline, raw email data is published
// to the `email-classification` Kafka topic. The Kafka consumer
// handles classification, storage, and reminder creation with retries.

const ConnectedAccount = require("../modules/connectedAccount/connectedAccount.model");
const { refreshGoogleTokenIfNeeded, getGmailClient } = require("../services/google.service");
const { processMessage, syncRecentMessages } = require("../services/gmailSync.service");
const logger = require("../utils/logger");

/**
 * Main webhook handler
 */
exports.handleGmailWebhook = async (req, res) => {
  try {
    logger.info("Webhook", "Gmail webhook received");

    if (process.env.WEBHOOK_SECRET && req.query.token !== process.env.WEBHOOK_SECRET) {
      logger.warn("Webhook", "Unauthorized webhook access");
      return res.sendStatus(403);
    }

    const message = req.body.message;

    if (!message || !message.data) {
      return res.sendStatus(200);
    }

    // Decode Pub/Sub message
    const decodedData = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf-8")
    );

    const { emailAddress, historyId } = decodedData;

    logger.info("Webhook", `Email: ${emailAddress}`);
    logger.info("Webhook", `New HistoryId: ${historyId}`);

    const account = await ConnectedAccount.findOne({
      emailAddress,
      provider: "google",
      isActive: true,
    });

    if (!account) {
      logger.warn("Webhook", "No connected account found");
      return res.sendStatus(200);
    }

    await fetchNewEmails(account, historyId);

    res.sendStatus(200);
  } catch (error) {
    logger.error("Webhook", "Gmail webhook error", error);
    res.sendStatus(200); // always 200 for Pub/Sub
  }
};

/**
 * Fetch new emails using Gmail History API
 * Now publishes to Kafka instead of inline classification.
 */
async function fetchNewEmails(account, newHistoryId) {
  try {
    // Guard: lastHistoryId must exist — set during watch() in google.controller.js
    if (!account.lastHistoryId) {
      logger.warn("Webhook", "No lastHistoryId on account, skipping history fetch");
      account.lastHistoryId = newHistoryId;
      await account.save();
      return;
    }

    const oauthClient = await refreshGoogleTokenIfNeeded(account);
    const gmail = getGmailClient(oauthClient);

    let historyResponse;
    try {
      historyResponse = await gmail.users.history.list({
        userId: "me",
        startHistoryId: account.lastHistoryId,
      });
    } catch (histErr) {
      // History cursor too old/expired → fall back to recent messages so the
      // push isn't silently dropped (the same recovery the auto-sync uses).
      if (histErr.code === 404 || histErr.message?.includes("historyId")) {
        logger.warn("Webhook", "History expired, falling back to recent messages");
        await syncRecentMessages(gmail, account);
        account.lastHistoryId = newHistoryId;
        await account.save();
        return;
      }
      throw histErr;
    }

    if (!historyResponse.data.history) {
      account.lastHistoryId = newHistoryId;
      await account.save();
      return;
    }

    for (const record of historyResponse.data.history) {
      if (!record.messagesAdded) continue;

      for (const msgObj of record.messagesAdded) {
        const msg = msgObj.message;

        // Only process INBOX messages
        if (!msg.labelIds || !msg.labelIds.includes("INBOX")) continue;

        // Extract + publish to Kafka for async classification (shared logic).
        await processMessage(gmail, msg.id, account);
      }
    }

    account.lastHistoryId = newHistoryId;
    await account.save();

  } catch (error) {
    logger.error("Webhook", "fetchNewEmails error", error);
  }
}
