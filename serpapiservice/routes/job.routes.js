/**
 * job.routes.js
 * -------------
 * User-facing API – reads from MongoDB only (no SerpAPI call at search time).
 *
 *   GET /api/jobs/search?role=Cloud&type=fresher   → filtered cards
 *   GET /api/jobs/roles                            → list available roles
 *   POST /api/jobs/refresh                         → manually trigger cron
 */

const express = require("express");
const router = express.Router();
const Job = require("../models/job.model");
const { refreshJobs } = require("../services/jobCron.service");

/* ──────────────────────────────────────────────────────────────
   GET /api/jobs/search
   Query params:
     role  – one of the 7 roles (optional, omit for all)
     type  – "fresher" | "experienced" (optional)
     page  – pagination page  (default 1)
     limit – page size         (default 20)
   ────────────────────────────────────────────────────────────── */
router.get("/search", async (req, res) => {
  try {
    const { role, type, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (type && ["fresher", "experienced"].includes(type))
      filter.jobType = type;

    const skip = (Math.max(Number(page), 1) - 1) * Number(limit);

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .select("title company location salary jobType role postedAt applyLinks")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      jobs,
    });
  } catch (err) {
    console.error("[API] Search error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────
   GET /api/jobs/roles  → quick helper for front-end dropdowns
   ────────────────────────────────────────────────────────────── */
router.get("/roles", async (_req, res) => {
  try {
    const roles = await Job.distinct("role");
    res.json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   POST /api/jobs/refresh  → manually trigger a full refresh
   ────────────────────────────────────────────────────────────── */
router.post("/refresh", async (_req, res) => {
  try {
    const result = await refreshJobs();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
