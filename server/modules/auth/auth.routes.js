const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");
const rateLimit = require("express-rate-limit");
const { validateBody, joiSchemas } = require("../../utils/joiSchemas");

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: { message: "Too many OTP requests from this IP, please try again after 10 minutes" }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: { message: "Too many login attempts from this IP, please try again after 15 minutes" }
});

// Signup flow: send-signup-otp → signup
router.post("/send-signup-otp", otpLimiter, validateBody(joiSchemas.sendSignupOtp), controller.sendSignupOtp);
router.post("/signup", validateBody(joiSchemas.signup), controller.signup);
router.post("/login", loginLimiter, validateBody(joiSchemas.login), controller.login);
router.post("/logout", controller.logout);

// Password flow: forgot-password (email link sent) → reset-password / change-password
router.post("/forgot-password", otpLimiter, validateBody(joiSchemas.forgotPassword), controller.forgotPassword);
router.post("/reset-password", validateBody(joiSchemas.resetPassword), controller.resetPassword);   // no old password needed
router.post("/change-password", validateBody(joiSchemas.changePassword), controller.changePassword); // old password required

module.exports = router;