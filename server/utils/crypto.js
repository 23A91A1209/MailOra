/**
 * Crypto Utility — AES-256-GCM Authenticated Encryption / Decryption
 *
 * Provides field-level encryption at rest for sensitive email content
 * and OAuth tokens. Uses AES-256-GCM with random IVs and authentication tags
 * to prevent both tampering and padding oracle attacks.
 *
 * Also provides a cryptographically secure OTP generator.
 *
 * SECURITY: The server will refuse to start if EMAIL_ENCRYPTION_KEY is missing.
 *
 * Migration: Backward-compatible with legacy AES-256-CBC ciphertext.
 * New encryptions use GCM; decryptions detect format automatically.
 */

const crypto = require("crypto");
const logger = require("./logger");

// ─── Constants ──────────────────────────────────────────────────────────────
const ALGORITHM_GCM = "aes-256-gcm";
const ALGORITHM_CBC = "aes-256-cbc";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const GCM_PREFIX = "gcm:";
const OTP_MIN = 100000;
const OTP_MAX = 999999;

// ─── Encryption Key (REQUIRED — no silent fallback) ─────────────────────────
if (!process.env.EMAIL_ENCRYPTION_KEY) {
  console.error("FATAL: EMAIL_ENCRYPTION_KEY is not defined in environment variables!");
  console.error("       The server cannot start without an encryption key.");
  console.error("       Set EMAIL_ENCRYPTION_KEY in your .env file and restart.");
  process.exit(1);
}

const key = crypto
  .createHash("sha256")
  .update(process.env.EMAIL_ENCRYPTION_KEY)
  .digest();

// ─── Encrypt (AES-256-GCM — authenticated encryption) ──────────────────────
/**
 * Encrypt a string using AES-256-GCM with a random IV and authentication tag.
 * Output format: "gcm:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted string with GCM prefix
 */
exports.encrypt = (text) => {
  try {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${GCM_PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    logger.error("Crypto", "Encryption error", err);
    throw err;
  }
};

// ─── Decrypt (auto-detects GCM vs legacy CBC format) ────────────────────────
/**
 * Decrypt a string encrypted with AES-256-GCM or legacy AES-256-CBC.
 * Automatically detects format via the "gcm:" prefix.
 *
 * @param {string} text - Encrypted string
 * @returns {string} Decrypted plaintext
 */
exports.decrypt = (text) => {
  try {
    if (!text || typeof text !== "string") return text;

    // ─── AES-256-GCM format: "gcm:<iv>:<authTag>:<ciphertext>" ────
    if (text.startsWith(GCM_PREFIX)) {
      const parts = text.slice(GCM_PREFIX.length).split(":");
      if (parts.length < 3) return text;

      const iv = Buffer.from(parts[0], "hex");
      const authTag = Buffer.from(parts[1], "hex");
      const encryptedText = parts.slice(2).join(":");

      const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    }

    // ─── Legacy AES-256-CBC format: "<iv>:<ciphertext>" ───────────
    if (!text.includes(":")) return text;
    const parts = text.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedText = parts.join(":");

    const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    logger.warn("Crypto", "Decryption error", err.message);
    return "Error decrypting text";
  }
};

// ─── Secure OTP Generator ───────────────────────────────────────────────────
/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt() instead of Math.random() for security.
 * @returns {string} A 6-digit OTP string (e.g., "042931")
 */
exports.generateOtp = () => {
  return String(crypto.randomInt(OTP_MIN, OTP_MAX));
};