const mongoose = require("mongoose");

// Stage: confirmed — offer letters, congratulations, onboarding, acceptance emails
const confirmedSchema = new mongoose.Schema(
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
    matter:  String,
    links:   [String],

    receivedAt: Date,

    category: {
      type: String,
      enum: ["job", "internship", "hackathon", "workshop"],
      required: true,
    },

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

confirmedSchema.index({ providerMessageId: 1, provider: 1 }, { unique: true });
confirmedSchema.index({ userId: 1, receivedAt: -1 });
confirmedSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ConfirmedEmail", confirmedSchema);
