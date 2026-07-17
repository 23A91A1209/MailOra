// webhooks/gmail.webhook.js

const express = require("express");
const router = express.Router();
const { handleGmailWebhook } = require("./gmail.webhook.controller");

router.post("/gmail", handleGmailWebhook);

module.exports = router;