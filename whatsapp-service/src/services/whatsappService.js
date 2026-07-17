const client = require("../config/whatsapp");

// ─── WhatsApp Service Layer ─────────────────────────────────────────────────

/**
 * Cleans a phone number string and appends the WhatsApp suffix.
 * Strips spaces, dashes, plus signs, and parentheses.
 * @param {string} number - Raw phone number (e.g. "+91 98765-43210")
 * @returns {string} Formatted WhatsApp ID (e.g. "919876543210@c.us")
 */
function formatNumber(number) {
  const cleaned = number.toString().replace(/[\s\-\+\(\)]/g, "");
  return `${cleaned}@c.us`;
}

/**
 * Send a single WhatsApp message after verifying the recipient is
 * a registered WhatsApp user.
 * @param {string} number - Phone number (digits only, with country code)
 * @param {string} message - Text content to send
 * @returns {Promise<object>} Result object with status
 */
async function sendMessage(number, message) {
  const chatId = formatNumber(number);

  // Check if the number is actually on WhatsApp
  const isRegistered = await client.isRegisteredUser(chatId);
  if (!isRegistered) {
    return {
      success: false,
      number,
      error: "Not on WhatsApp",
    };
  }

  await client.sendMessage(chatId, message);

  return {
    success: true,
    number,
    message,
  };
}

/**
 * Send messages to multiple recipients with a mandatory 2-second
 * delay between each to avoid WhatsApp rate-limiting / bans.
 * @param {Array<{number: string, message: string}>} recipients
 * @returns {Promise<object>} Aggregated results array
 */
async function sendBulkMessages(recipients) {
  const results = [];

  for (let i = 0; i < recipients.length; i++) {
    const { number, message } = recipients[i];

    try {
      const chatId = formatNumber(number);
      const isRegistered = await client.isRegisteredUser(chatId);

      if (!isRegistered) {
        results.push({ number, status: "failed", error: "Not on WhatsApp" });
      } else {
        await client.sendMessage(chatId, message);
        results.push({ number, status: "sent" });
      }
    } catch (err) {
      results.push({ number, status: "failed", error: err.message });
    }

    // 2-second delay between messages (skip after the last one)
    if (i < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return { success: true, results };
}

module.exports = {
  formatNumber,
  sendMessage,
  sendBulkMessages,
};
