require("dotenv").config();
const connectDB = require("./config/db");
const { refreshJobs } = require("./services/jobCron.service");

async function run() {
  await connectDB();
  console.log("Forcing 5-page manual refresh...");
  await refreshJobs();
  process.exit(0);
}

run();
