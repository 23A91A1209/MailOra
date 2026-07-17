const mongoose = require("mongoose");

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const educationSchema = new mongoose.Schema({
  degree:      { type: String, trim: true, default: "" },
  institution: { type: String, trim: true, default: "" },
  year:        { type: String, trim: true, default: "" },
}, { _id: true });

const experienceSchema = new mongoose.Schema({
  role:        { type: String, trim: true, default: "" },
  company:     { type: String, trim: true, default: "" },
  duration:    { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
}, { _id: true });

const projectSchema = new mongoose.Schema({
  title:       { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  link:        { type: String, trim: true, default: "" },
}, { _id: true });

const certificationSchema = new mongoose.Schema({
  name:   { type: String, trim: true, default: "" },
  issuer: { type: String, trim: true, default: "" },
  year:   { type: String, trim: true, default: "" },
}, { _id: true });

// ── Main User Schema ────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Auth & Identity ──
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      select: false, // do not return by default
    },

    authProvider: {
      type: String,
      enum: ["local", "google", "microsoft"],
      default: "local",
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    microsoftId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ── Basic Profile Info ──
    firstName: { type: String, trim: true, default: "" },
    lastName:  { type: String, trim: true, default: "" },
    role:      { type: String, trim: true, default: "" },
    about:     { type: String, trim: true, default: "" },

    // Profile photo (S3)
    photoUrl:   { type: String, default: "" },
    photoS3Key: { type: String, default: "" },

    // ── Contact ──
    mobileNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    countryCode: {
      type: String,
      default: "+91",
    },

    isMobileVerified: {
      type: Boolean,
      default: false,
    },

    mobileOtp: {
      type: String,
      select: false,
    },

    mobileOtpExpiry: {
      type: Date,
      select: false,
    },

    // ── Profile Sections ──
    skills:         [{ type: String, trim: true }],
    education:      [educationSchema],
    experience:     [experienceSchema],
    projects:       [projectSchema],
    certifications: [certificationSchema],
    achievements:   { type: String, trim: true, default: "" },

    // Coding profiles
    codingProfiles: {
      github:   { type: String, trim: true, default: "" },
      leetcode: { type: String, trim: true, default: "" },
      codechef: { type: String, trim: true, default: "" },
    },

    // Connected email accounts (up to 3)
    connectedMails: {
      type: [String],
      validate: [arr => arr.length <= 3, "Maximum 3 connected emails allowed"],
      default: [],
    },

    // ── Resume (S3) ──
    resumeUrl:   String,
    resumeS3Key: String,

    extractedSkills: [{ type: String, trim: true }],

    // ── Preferences ──
    reminderPreferences: {
      whatsapp: { type: Boolean, default: true },
      email:    { type: Boolean, default: true },
    },

    // ── Password Reset ──
    passwordResetOtp: {
      type: String,
      select: false,
    },

    passwordResetOtpExpiry: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);