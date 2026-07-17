const express = require("express");
const router = express.Router();
const controller = require("./user.controller");
const { protect } = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/upload.middleware");
const { photoUpload } = require("../../middlewares/upload.middleware");
const { validateBody, joiSchemas } = require("../../utils/joiSchemas");

// ── Profile ──
router.get("/me",                  protect, controller.getProfile);
router.put("/basic",               protect, validateBody(joiSchemas.updateBasicInfo), controller.updateBasicInfo);
router.put("/profile",             protect, controller.updateProfileData);
router.put("/section/:section",    protect, validateBody(joiSchemas.updateSection), controller.updateSection);
router.put("/change-password",     protect, validateBody(joiSchemas.changeProfilePassword), controller.changePassword);

// ── Mobile Verification (WhatsApp OTP) ──
router.post("/send-mobile-otp",    protect, validateBody(joiSchemas.sendMobileOtp), controller.sendMobileOtp);
router.post("/verify-mobile-otp",  protect, validateBody(joiSchemas.verifyMobileOtp), controller.verifyMobileOtp);

// ── File Uploads (S3) ──
router.post("/upload-photo",       protect, photoUpload.single("photo"),  controller.uploadPhoto);
router.post("/upload-resume",      protect, upload.single("file"),        controller.uploadResume);

// ── Legacy ──
router.put("/update",              protect, controller.updateProfile);

module.exports = router;