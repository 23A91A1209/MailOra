const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const logger = require("../utils/logger");

// ─── WhatsApp Client Configuration ──────────────────────────────────────────
// LocalAuth persists the session in .wwebjs_auth/ so QR scan is only
// required on the very first run. Every subsequent restart reuses the
// saved session automatically.
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "whatsapp-service",
    dataPath: "./.wwebjs_auth",
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // Cloud VMs give containers a tiny (64MB) /dev/shm, which crashes
      // Chromium; write shared memory to /tmp instead.
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  },
});

// ─── Client Event Handlers ──────────────────────────────────────────────────

// Display QR code in the terminal (first run only)
client.on("qr", (qr) => {
  logger.info("WhatsApp", "Scan QR code below with WhatsApp app");
  qrcode.generate(qr, { small: true });
});

// Session has been saved/restored successfully
client.on("authenticated", () => {
  logger.info("WhatsApp", "Session authenticated & saved");
});

// Client is fully ready to send/receive messages
client.on("ready", () => {
  logger.info("WhatsApp", "Client is ready");
});

// Authentication failed (session corrupt, revoked, etc.)
client.on("auth_failure", (msg) => {
  logger.error("WhatsApp", "Auth failure", msg);
});

// Client got disconnected
client.on("disconnected", (reason) => {
  logger.warn("WhatsApp", "Disconnected", reason);
});

module.exports = client;

