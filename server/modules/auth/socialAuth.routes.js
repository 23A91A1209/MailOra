const express = require("express");
const router = express.Router();
const controller = require("./socialAuth.controller");

// Google Sign-In / Sign-Up
router.get("/google", controller.googleSignIn);
router.get("/google/callback", controller.googleCallback);

// Microsoft Sign-In / Sign-Up
router.get("/microsoft", controller.microsoftSignIn);
router.get("/microsoft/callback", controller.microsoftCallback);

module.exports = router;
