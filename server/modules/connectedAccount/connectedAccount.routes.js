const express = require("express");
const router = express.Router();
const controller = require("./connectedAccount.controller");
const { protect } = require("../../middlewares/auth.middleware");

router.get("/", protect, controller.getAccounts);
router.delete("/:id", protect, controller.disconnectAccount);

// Email ingestion is fully automatic: push via the Gmail webhook + a periodic
// auto-sync backfill (services/gmailSync.service.js). No manual sync endpoint.

module.exports = router;