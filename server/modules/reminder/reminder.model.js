const mongoose = require("mongoose");

/**
 * Reminder Schema — Stores scheduled WhatsApp reminders for emails with deadlines.
 *
 * Each classified email that has a deadlineDate gets multiple reminder entries
 * created (immediate, 3-days-before, 24hrs, 12hrs, 1hr) depending on how far
 * the deadline is from the time of ingestion.
 */
const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Reference to the source email document
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Which email model this belongs to (so we can populate if needed)
    emailModel: {
      type: String,
      enum: ["RegistrationEmail", "InProgressEmail"],
      required: true,
    },

    // Plaintext fields for the WhatsApp message (NOT encrypted)
    emailSubject: {
      type: String,
      required: true,
    },

    emailCategory: {
      type: String,
      enum: ["job", "internship", "hackathon", "workshop"],
    },

    emailMatter: {
      type: String,
      default: "",
    },

    // The deadline of the original email
    deadlineDate: {
      type: Date,
      required: true,
    },

    // When this reminder should fire
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    // Type of reminder for logging / dedup
    reminderType: {
      type: String,
      enum: ["immediate", "3days", "24hrs", "12hrs", "1hr"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "queued", "sent", "failed", "skipped"],
      default: "pending",
      index: true,
    },

    // Error details if sending failed
    failReason: {
      type: String,
      default: "",
    },

    sentAt: Date,
  },
  { timestamps: true }
);

// Compound index: efficiently find due reminders
reminderSchema.index({ status: 1, scheduledAt: 1 });

// Prevent duplicate reminders for the same email + type
reminderSchema.index(
  { emailId: 1, reminderType: 1 },
  { unique: true }
);

module.exports = mongoose.model("Reminder", reminderSchema);
