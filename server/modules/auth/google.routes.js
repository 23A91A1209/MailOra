const express = require("express");
const router = express.Router();
const controller = require("./google.controller");
const { protect } = require("../../middlewares/auth.middleware");

router.get("/google", protect, controller.googleAuth);
router.get("/google/callback", controller.googleCallback);

module.exports = router;