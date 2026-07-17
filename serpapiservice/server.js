require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { startJobCron } = require("./services/jobCron.service");

const app = express();

/* ── Middleware ─────────────────────────────────────────────── */
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: [
      "https://mail-or-a.dev",
      "https://server.mail-or-a.dev",
    ],
    credentials: true,
  })
);

/* ── Health check ──────────────────────────────────────────── */
app.get("/", (_req, res) => {
  res.json({
    service: "serpapiservice",
    status: "running",
    uptime: process.uptime(),
  });
});

/* ── Routes ────────────────────────────────────────────────── */
app.use("/api/jobs", require("./routes/job.routes"));

/* ── Boot ──────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[SerpAPIService] 🚀  Running on port ${PORT}`);
    startJobCron(); // kick off cron after DB is ready
  });
});
