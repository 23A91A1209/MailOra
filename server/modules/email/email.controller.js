/**
 * Email Controller
 *
 * Handles CRUD operations for classified emails across all 4 stage collections.
 * Uses a factory pattern to eliminate repetitive stage-specific handlers.
 * Supports pagination via ?page=N&limit=N query params (defaults: page=1, limit=20).
 */

const RegistrationEmail = require("./registration.model");
const RegisteredEmail   = require("./registered.model");
const InProgressEmail   = require("./inprogress.model");
const ConfirmedEmail    = require("./confirmed.model");
const Reminder          = require("../reminder/reminder.model");
const { decrypt }       = require("../../utils/crypto");
const asyncHandler      = require("../../utils/asyncHandler");
const { sendSuccess, sendPaginated, sendError } = require("../../utils/apiResponse");
const logger            = require("../../utils/logger");

// ─── Model Registry ─────────────────────────────────────────────────────────
const MODELS = [
  { model: RegistrationEmail, type: "registration" },
  { model: RegisteredEmail,   type: "registered"   },
  { model: InProgressEmail,   type: "inprogress"   },
  { model: ConfirmedEmail,    type: "confirmed"     },
];

const MODEL_MAP = Object.fromEntries(MODELS.map((m) => [m.type, m]));

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Decrypt all encrypted fields on an email document.
 * @param {object} email - Mongoose document
 * @param {string} type  - Email stage type
 * @returns {object} Decrypted plain object
 */
function decryptEmail(email, type) {
  return {
    ...email._doc,
    type,
    subject: decrypt(email.subject),
    from:    decrypt(email.from),
    snippet: decrypt(email.snippet),
    body:    decrypt(email.body),
    matter:  email.matter ? decrypt(email.matter) : "",
    links:   Array.isArray(email.links) ? email.links.map(l => decrypt(l)) : [],
  };
}

/**
 * Parse pagination params from query string with sensible defaults.
 * @param {object} query - req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

// ─── Factory: Stage-Specific Email Handler ──────────────────────────────────

/**
 * Factory function that creates a handler for fetching emails by stage.
 * Eliminates the need for 4 nearly-identical exported functions.
 *
 * @param {string} type - One of "registration", "registered", "inprogress", "confirmed"
 * @returns {Function} Express route handler
 */
function getEmailsByStage(type) {
  const entry = MODEL_MAP[type];
  if (!entry) throw new Error(`Invalid email stage type: ${type}`);

  return asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);

    const [emails, total] = await Promise.all([
      entry.model
        .find({ userId: req.user._id })
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit),
      entry.model.countDocuments({ userId: req.user._id }),
    ]);

    sendPaginated(
      res,
      emails.map((e) => decryptEmail(e, type)),
      { page, limit, total, totalPages: Math.ceil(total / limit) },
      `${type} emails fetched`
    );
  });
}

// ─── Exported Handlers ──────────────────────────────────────────────────────

/**
 * GET /api/emails — all emails for the user across all categories.
 *
 * Uses MongoDB $unionWith aggregation to do cross-collection pagination
 * entirely at the database level, avoiding in-memory sort/slice.
 * Falls back to parallel query approach if aggregation is unavailable.
 */
exports.getAllEmails = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId = req.user._id;

  try {
    // ─── Database-level cross-collection pagination via $unionWith ──
    // This avoids fetching ALL documents into memory just to paginate.
    const pipeline = [
      { $match: { userId } },
      { $addFields: { _type: "registration" } },
      { $unionWith: { coll: "registeredemails", pipeline: [{ $match: { userId } }, { $addFields: { _type: "registered" } }] } },
      { $unionWith: { coll: "inprogressemails", pipeline: [{ $match: { userId } }, { $addFields: { _type: "inprogress" } }] } },
      { $unionWith: { coll: "confirmedemails",  pipeline: [{ $match: { userId } }, { $addFields: { _type: "confirmed" } }] } },
      { $sort: { receivedAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await RegistrationEmail.aggregate(pipeline);

    const total = result.totalCount[0]?.count || 0;
    const emails = result.data.map((doc) => ({
      ...doc,
      type: doc._type,
      subject: decrypt(doc.subject),
      from:    decrypt(doc.from),
      snippet: decrypt(doc.snippet),
      body:    decrypt(doc.body),
      matter:  doc.matter ? decrypt(doc.matter) : "",
      links:   Array.isArray(doc.links) ? doc.links.map(l => decrypt(l)) : [],
    }));

    sendPaginated(res, emails, {
      page, limit, total, totalPages: Math.ceil(total / limit),
    }, "All emails fetched");

  } catch (aggregationErr) {
    // Fallback: parallel queries (for older MongoDB versions without $unionWith)
    logger.warn("Email", "Aggregation fallback for getAllEmails", aggregationErr.message);

    const counts = await Promise.all(
      MODELS.map(({ model }) => model.countDocuments({ userId }))
    );
    const total = counts.reduce((sum, c) => sum + c, 0);

    // Distribute limit proportionally across collections
    const results = await Promise.all(
      MODELS.map(({ model, type }) =>
        model
          .find({ userId })
          .sort({ receivedAt: -1 })
          .limit(limit) // Fetch at most `limit` from each to bound memory
          .then((docs) => docs.map((doc) => decryptEmail(doc, type)))
      )
    );

    const all = results
      .flat()
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    const paginated = all.slice(skip, skip + limit);

    sendPaginated(res, paginated, {
      page, limit, total, totalPages: Math.ceil(total / limit),
    }, "All emails fetched");
  }
});

// Stage-specific handlers — generated via factory
exports.getRegistrationEmails = getEmailsByStage("registration");
exports.getRegisteredEmails   = getEmailsByStage("registered");
exports.getInProgressEmails   = getEmailsByStage("inprogress");
exports.getConfirmedEmails    = getEmailsByStage("confirmed");

// DELETE /api/emails/:type/:id — delete a single email and its pending reminders
exports.deleteEmail = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  const modelEntry = MODEL_MAP[type];
  if (!modelEntry) {
    return sendError(res, 400, `Invalid email type: ${type}`);
  }

  // Only allow deleting own emails
  const email = await modelEntry.model.findOne({ _id: id, userId: req.user._id });
  if (!email) {
    return sendError(res, 404, "Email not found");
  }

  // Delete the email
  await modelEntry.model.deleteOne({ _id: id });

  // Also cancel any pending reminders linked to this email
  await Reminder.deleteMany({ emailId: id, status: "pending" });

  logger.info("Email", `Deleted ${type} email ${id} and associated reminders`);
  sendSuccess(res, 200, "Email deleted successfully");
});
