/**
 * Connected Account Controller
 *
 * Manages Gmail/Outlook connected accounts. Handles listing
 * and disconnecting accounts for the authenticated user.
 */

const ConnectedAccount = require("./connectedAccount.model");
const logger = require("../../utils/logger");

// Get all connected accounts for user
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await ConnectedAccount.find({
      userId: req.user._id,
      isActive: true,
    }).select("emailAddress provider isActive createdAt");

    res.json(accounts);
  } catch (err) {
    logger.error("Account", "Error fetching accounts", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Disconnect (delete) a connected account
exports.disconnectAccount = async (req, res) => {
  try {
    const account = await ConnectedAccount.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({ message: "Account disconnected", emailAddress: account.emailAddress });
  } catch (err) {
    logger.error("Account", "Error disconnecting account", err);
    res.status(500).json({ message: "Server error" });
  }
};