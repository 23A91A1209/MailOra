/**
 * Email Classification Consumer
 *
 * Consumes messages from the `email-classification` Kafka topic.
 * For each message:
 *   1. Calls Gemini AI to classify the email
 *   2. Stores the classified email in the correct MongoDB collection
 *   3. Creates WhatsApp reminders if the email has a deadline
 *   4. On failure: retries with exponential backoff, then sends to DLQ
 */

const { createConsumer, TOPICS } = require("../../config/kafka");
const { classifyEmail } = require("../emailAI.service");
const { createReminders } = require("../reminderCreator.service");
const { encrypt } = require("../../utils/crypto");
const { sendToDLQ } = require("./dlq.handler");
const logger = require("../../utils/logger");

// Models
const RegistrationEmail = require("../../modules/email/registration.model");
const RegisteredEmail = require("../../modules/email/registered.model");
const InProgressEmail = require("../../modules/email/inprogress.model");
const ConfirmedEmail = require("../../modules/email/confirmed.model");

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
const VALID_CATEGORIES = ["job", "internship", "hackathon", "workshop"];
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000; // 1s, 2s, 4s, 8s, 16s

/** Map stage name → Mongoose model */
const STAGE_MODELS = {
  registration: RegistrationEmail,
  registered:   RegisteredEmail,
  inprogress:   InProgressEmail,
  confirmed:    ConfirmedEmail,
};

/** Map stage name → model name string (for reminder references) */
const STAGE_MODEL_NAMES = {
  registration: "RegistrationEmail",
  inprogress:   "InProgressEmail",
};

/**
 * Shared handler for stages that have deadlines (registration + inprogress).
 * Parses the deadline, stores the email, and creates WhatsApp reminders.
 *
 * @param {object} params
 * @param {object} params.baseDoc  - Common email document fields
 * @param {string} params.deadline - AI-extracted deadline string (or null)
 * @param {string} params.stage    - "registration" or "inprogress"
 * @param {object} params.Model    - Mongoose model for this stage
 * @param {string} params.userId   - User's ObjectId
 * @param {string} params.subject  - Plaintext email subject
 * @param {string} params.category - Email category
 * @param {string} params.matter   - AI-generated summary
 * @returns {object} Saved email document
 */
async function processDeadlineEmail({ baseDoc, deadline, stage, Model, userId, subject, category, matter }) {
  let deadlineDate = deadline ? new Date(deadline) : null;
  if (!deadlineDate || isNaN(deadlineDate.getTime())) {
    deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: 24h from now
  }

  const savedEmail = await Model.create({ ...baseDoc, deadlineDate });

  // Create WhatsApp reminders (non-blocking — failure doesn't affect email storage)
  try {
    await createReminders({
      userId,
      emailId: savedEmail._id,
      emailModel: STAGE_MODEL_NAMES[stage],
      emailSubject: subject,
      emailCategory: category,
      emailMatter: matter || "",
      deadlineDate,
    });
  } catch (reminderErr) {
    logger.warn("KafkaConsumer", "Reminder creation failed (non-blocking)", reminderErr);
  }

  return savedEmail;
}

/**
 * Process a single email classification message with retry logic.
 */
async function processEmailMessage(messagePayload) {
  const {
    userId,
    connectedAccountId,
    provider,
    messageId,
    subject,
    from,
    snippet,
    body,
    internalDate,
  } = messagePayload;

  let retryCount = messagePayload.retryCount || 0;

  while (retryCount <= MAX_RETRIES) {
    try {
      // ─── Step 1: AI Classification ──────────────────────────────
      const aiResult = await classifyEmail(subject, snippet);
      const { category, stage, deadline, matter, links } = aiResult;

      logger.info("KafkaConsumer", `Classified [${category}/${stage}]: ${subject?.substring(0, 60)}`);

      // Skip non-tracked categories
      if (!VALID_CATEGORIES.includes(category)) {
        logger.debug("KafkaConsumer", `Skipped — category: ${category}`);
        return;
      }

      // Skip unknown stages
      const Model = STAGE_MODELS[stage];
      if (!Model) {
        logger.debug("KafkaConsumer", `Skipped — stage: ${stage}`);
        return;
      }

      // ─── Step 2: Store in MongoDB ───────────────────────────────
      const expiresAt = new Date(Date.now() + THREE_MONTHS_MS);

      const baseDoc = {
        userId,
        connectedAccountId,
        provider,
        providerMessageId: messageId,
        subject: encrypt(subject),
        from: encrypt(from),
        snippet: encrypt(snippet),
        body: encrypt(body),
        matter: matter ? encrypt(matter) : encrypt(""),
        links: Array.isArray(links) ? links.map((l) => encrypt(l)) : [],
        receivedAt: new Date(parseInt(internalDate)),
        category,
        aiProcessed: true,
        expiresAt,
      };

      // Stages with deadlines share the same processing logic
      if (stage === "registration" || stage === "inprogress") {
        await processDeadlineEmail({
          baseDoc, deadline, stage, Model,
          userId, subject, category, matter,
        });
      } else {
        await Model.create(baseDoc);
      }

      logger.info("KafkaConsumer", `Stored [${category}/${stage}]: ${subject?.substring(0, 60)}`);
      return; // Success — exit retry loop

    } catch (err) {
      retryCount++;

      if (err.code === 11000) {
        // Duplicate email — not an error, just skip
        logger.debug("KafkaConsumer", `Duplicate skipped: ${messageId}`);
        return;
      }

      if (retryCount > MAX_RETRIES) {
        logger.error("KafkaConsumer", `Max retries (${MAX_RETRIES}) exceeded for: ${subject?.substring(0, 50)}`, err);
        await sendToDLQ(
          TOPICS.EMAIL_CLASSIFICATION,
          messagePayload,
          err.message,
          retryCount - 1
        );
        return;
      }

      // Exponential backoff
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, retryCount - 1);
      logger.warn("KafkaConsumer", `Retry ${retryCount}/${MAX_RETRIES} in ${backoffMs}ms — ${err.message}`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
}

/**
 * Start the email classification Kafka consumer.
 * Subscribes to the `email-classification` topic and processes messages sequentially.
 * @returns {object} Kafka consumer instance
 */
async function startEmailClassificationConsumer() {
  const consumer = createConsumer("email-classification-group");

  await consumer.connect();
  await consumer.subscribe({
    topic: TOPICS.EMAIL_CLASSIFICATION,
    fromBeginning: false,
  });

  logger.info("Kafka", "Email classification consumer started");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        await processEmailMessage(payload);
      } catch (err) {
        logger.error("KafkaConsumer", "Message parse/process error", err);
      }
    },
  });

  return consumer;
}

module.exports = { startEmailClassificationConsumer };
