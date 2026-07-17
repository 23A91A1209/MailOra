const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

// ─── API Routes ─────────────────────────────────────────────────────────────

// POST /api/send       → Send a single WhatsApp message
router.post("/send", messageController.send);

// POST /api/send-bulk  → Send bulk WhatsApp messages (2s delay between each)
router.post("/send-bulk", messageController.sendBulk);

// GET  /health         → Health check
router.get("/health", messageController.healthCheck);

module.exports = router;
