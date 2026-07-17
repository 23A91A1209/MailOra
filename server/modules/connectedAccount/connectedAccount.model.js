/**
 * Connected Account Model
 *
 * Stores OAuth tokens and metadata for connected email accounts (Gmail, Outlook).
 * Tokens are encrypted at rest using AES-256-CBC via Mongoose hooks.
 *
 * Security: accessToken and refreshToken are automatically encrypted before
 * saving to MongoDB and decrypted when read back into memory.
 */

const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../../utils/crypto");

const connectedAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Provider is enum-based for multi-provider extensibility.
    // Currently: Google Gmail. Future: Microsoft Outlook via Graph API.
    provider: {
      type: String,
      enum: ["google", "microsoft"],
      required: true,
    },

    emailAddress: {
      type: String,
      required: true,
    },

    // Encrypted at rest via pre("save") hook
    accessToken: {
      type: String,
      required: true,
    },

    // Encrypted at rest via pre("save") hook
    refreshToken: {
      type: String,
      required: true,
    },

    tokenExpiry: {
      type: Date,
      required: true,
    },

    // Gmail specific
    lastHistoryId: {
      type: String,
    },

    // Outlook specific
    subscriptionId: {
      type: String,
    },

    subscriptionExpiry: {
      type: Date,
    },

    // Gmail Pub/Sub watch expiry (7-day cycle, auto-renewed via cron)
    watchExpiry: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Internal flag to track whether tokens are already encrypted
    _tokensEncrypted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

// Prevent same email connected twice for same user
connectedAccountSchema.index(
  { userId: 1, emailAddress: 1 },
  { unique: true }
);

// ─── Encryption Hooks ───────────────────────────────────────────────────────

// Prefix used to mark already-encrypted tokens.
// This is more reliable than checking for `:` which can appear in OAuth tokens.
const ENCRYPTED_PREFIX = "enc:";

/**
 * Pre-save hook: encrypt accessToken and refreshToken before persisting.
 * Uses a prefix marker to avoid double-encryption on repeated saves.
 */
// Mongoose 9 removed the next() callback — middleware is sync/async now. This
// body is synchronous, so it simply returns (no next), which Mongoose awaits.
connectedAccountSchema.pre("save", function () {
  // Only encrypt if tokens were modified and aren't already encrypted
  if (this.isModified("accessToken") && this.accessToken && !this.accessToken.startsWith(ENCRYPTED_PREFIX)) {
    this.accessToken = ENCRYPTED_PREFIX + encrypt(this.accessToken);
  }
  if (this.isModified("refreshToken") && this.refreshToken && !this.refreshToken.startsWith(ENCRYPTED_PREFIX)) {
    this.refreshToken = ENCRYPTED_PREFIX + encrypt(this.refreshToken);
  }
  this._tokensEncrypted = true;
});

/**
 * Post-init hook: decrypt tokens when a document is read from MongoDB.
 * This ensures tokens are usable in-memory without manual decryption.
 */
connectedAccountSchema.post("init", function (doc) {
  if (doc.accessToken && doc.accessToken.startsWith(ENCRYPTED_PREFIX)) {
    doc.accessToken = decrypt(doc.accessToken.slice(ENCRYPTED_PREFIX.length));
  }
  if (doc.refreshToken && doc.refreshToken.startsWith(ENCRYPTED_PREFIX)) {
    doc.refreshToken = decrypt(doc.refreshToken.slice(ENCRYPTED_PREFIX.length));
  }
});

module.exports = mongoose.model(
  "ConnectedAccount",
  connectedAccountSchema
);