const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      default: "N/A",
      trim: true,
    },
    location: {
      type: String,
      default: "Remote",
      trim: true,
    },
    salary: {
      type: String,
      default: "Not disclosed",
    },
    jobType: {
      type: String,
      enum: ["fresher", "experienced"],
      default: "fresher",
    },
    role: {
      type: String,
      required: true,
      enum: [
        "Full Stack Developer",
        "Cloud",
        "AI Automation",
        "Flutter",
        "Data Analytics",
        "Cyber Security",
        "Machine Learning",
      ],
      index: true,
    },
    postedAt: {
      type: String,
      default: "",
    },
    applyLinks: {
      type: [String],
      default: [],
    },
    /* Raw snippet kept for debugging / future enrichment */
    snippet: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

/* Compound index for the most common query pattern */
jobSchema.index({ role: 1, jobType: 1 });

module.exports = mongoose.model("Job", jobSchema);
