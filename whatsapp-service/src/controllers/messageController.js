const { sendMessage, sendBulkMessages } = require("../services/whatsappService");

// ─── Message Controllers ────────────────────────────────────────────────────

/**
 * POST /api/send
 * Send a single WhatsApp message.
 * Body: { "number": "919876543210", "message": "Hello!" }
 */
exports.send = async (req, res) => {
  try {
    const { number, message } = req.body;

    // Validate request body
    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: "Both 'number' and 'message' fields are required.",
      });
    }

    const result = await sendMessage(number, message);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Send message error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to send message. WhatsApp may be disconnected.",
    });
  }
};

/**
 * POST /api/send-bulk
 * Send WhatsApp messages to multiple recipients.
 * Body: { "recipients": [{ "number": "91XXXXXXXXXX", "message": "Hi" }] }
 */
exports.sendBulk = async (req, res) => {
  try {
    const { recipients } = req.body;

    // Validate request body
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: "'recipients' must be a non-empty array of { number, message } objects.",
      });
    }

    // Validate each recipient entry
    for (const r of recipients) {
      if (!r.number || !r.message) {
        return res.status(400).json({
          success: false,
          error: "Each recipient must have both 'number' and 'message' fields.",
        });
      }
    }

    const result = await sendBulkMessages(recipients);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Bulk send error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to send bulk messages. WhatsApp may be disconnected.",
    });
  }
};

/**
 * GET /health
 * Simple health check endpoint.
 */
exports.healthCheck = (req, res) => {
  return res.status(200).json({
    success: true,
    status: "WhatsApp Service is running",
    timestamp: new Date().toISOString(),
  });
};
