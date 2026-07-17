const mongoose = require("mongoose");

// Temporary store for signup OTPs — deleted automatically after 10 minutes
const pendingVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },

  hashedOtp: {
    type: String,
    required: true,
  },

  // MongoDB TTL — auto-deletes the document after 10 minutes
  expiresAt: {
    type: Date,
    required: true,
  },
});

pendingVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingVerification", pendingVerificationSchema);
