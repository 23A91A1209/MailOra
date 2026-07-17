/**
 * Database Configuration — MongoDB Connection
 *
 * Establishes a connection to MongoDB Atlas (or local instance).
 * Uses the MONGO_URI environment variable.
 */

const mongoose = require("mongoose");
require("dotenv").config();
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB", "Connected successfully");
  } catch (err) {
    logger.error("MongoDB", "Connection failed — exiting", err);
    process.exit(1);
  }
};

module.exports = connectDB;