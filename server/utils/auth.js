/**
 * Auth Utility — Shared JWT & Cookie Helpers
 *
 * Centralizes token generation and cookie management to avoid
 * duplicating these functions across auth controllers.
 */

const jwt = require("jsonwebtoken");

/**
 * Generate a signed JWT token for a given user ID.
 * @param {string} id - User's MongoDB ObjectId
 * @returns {string} Signed JWT token (expires in 7 days)
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

/**
 * Set an httpOnly authentication cookie on the response.
 * @param {object} res - Express response object
 * @param {string} token - JWT token to store in the cookie
 */
const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

module.exports = { generateToken, setAuthCookie };
