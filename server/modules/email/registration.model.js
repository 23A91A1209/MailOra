const mongoose = require("mongoose");

// Stage: registration — emails asking user to apply or register
const registrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    connectedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedAccount",
      required: true,
    },

    provider: {
      type: String,
      enum: ["google", "microsoft"],
      required: true,
    },

    providerMessageId: {
      type: String,
      required: true,
    },

    // Encrypted fields
    subject: String,
    from:    String,
    snippet: String,
    body:    String,
    matter:  String, // newly added
    links:   [String], // newly added

    receivedAt: Date,

    category: {
      type: String,
      enum: ["job", "internship", "hackathon", "workshop"],
      required: true,
    },

    deadlineDate: Date,

    aiProcessed: {
      type: Boolean,
      default: false,
    },

    // TTL — auto-deleted after 3 months
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

registrationSchema.index({ providerMessageId: 1, provider: 1 }, { unique: true });
registrationSchema.index({ userId: 1, receivedAt: -1 });
registrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RegistrationEmail", registrationSchema);
