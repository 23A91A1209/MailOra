// modules/auth/google.controller.js

const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const ConnectedAccount = require("../connectedAccount/connectedAccount.model");
const {
  getGoogleOAuthClient,
  getGmailClient,
} = require("../../services/google.service");
const logger = require("../../utils/logger");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

/**
 * Extract a short, human-readable reason from a googleapis/OAuth error so the
 * frontend can show what actually went wrong instead of a generic message.
 */
function describeGoogleError(err) {
  return (
    err?.response?.data?.error_description || // OAuth token endpoint (e.g. invalid_grant)
    err?.response?.data?.error?.message ||    // Gmail API error object
    err?.errors?.[0]?.message ||              // googleapis GaxiosError shape
    err?.response?.data?.error ||             // bare OAuth error code
    err?.message ||
    "Unknown error"
  );
}

/**
 * Best-effort Gmail Pub/Sub watch. A failure here (e.g. topic misconfiguration)
 * must NOT abort account connection — the watchRenewal cron re-watches any
 * account without a fresh watchExpiry every 6 hours.
 *
 * @returns {{ historyId?: string, watchExpiry?: Date } | null}
 */
async function startGmailWatch(gmail, emailAddress) {
  try {
    const { data } = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: process.env.GOOGLE_PUBSUB_TOPIC,
        labelIds: ["INBOX"],
      },
    });
    return {
      historyId: data.historyId,
      watchExpiry: data.expiration ? new Date(parseInt(data.expiration, 10)) : undefined,
    };
  } catch (err) {
    logger.error(
      "GoogleAuth",
      `gmail.users.watch failed for ${emailAddress} — account still connected, watch cron will retry`,
      err
    );
    return null;
  }
}

/**
 * Step 1: Redirect user to Google
 */
exports.googleAuth = async (req, res) => {
  try {
    const oauthClient = getGoogleOAuthClient();

    const stateToken = jwt.sign({ userId: req.user._id.toString() }, process.env.JWT_SECRET, {
        expiresIn: "10m",
    });

    const authUrl = oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state: stateToken, // pass userId as a signed JWT
    });

    res.redirect(authUrl);
  } catch (error) {
    logger.error("GoogleAuth", "Google auth error", error);
    res.status(500).json({ message: "Google auth failed" });
  }
};

/**
 * Step 2: Handle callback
 */
exports.googleCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "https://mail-or-a.dev";
  const fail = (msg) =>
    res.redirect(`${frontendUrl}/profile?gmail=error&msg=${encodeURIComponent(msg)}`);
  const succeed = (emailAddress) =>
    res.redirect(`${frontendUrl}/profile?gmail=success&email=${encodeURIComponent(emailAddress)}`);

  try {
    const { code, state, error: oauthError } = req.query;

    // User cancelled the Google consent screen, or Google returned an error there
    if (oauthError) {
      return fail(
        oauthError === "access_denied"
          ? "You cancelled the Google consent screen"
          : `Google error: ${oauthError}`
      );
    }

    if (!code || !state) {
      return fail("Authorization code missing");
    }

    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch (err) {
      return fail("Session expired — please start the connection again");
    }

    const userId = decoded.userId;

    const oauthClient = getGoogleOAuthClient();

    // Exchange code for tokens. Auth codes are single-use — a refreshed/duplicated
    // callback reuses the code and fails here with invalid_grant.
    let tokens;
    try {
      ({ tokens } = await oauthClient.getToken(code));
    } catch (err) {
      logger.error("GoogleAuth", "Token exchange failed", err);
      return fail(`Google sign-in failed: ${describeGoogleError(err)}`);
    }

    oauthClient.setCredentials(tokens);

    const gmail = getGmailClient(oauthClient);

    // Get Gmail profile
    const profile = await gmail.users.getProfile({ userId: "me" });
    const emailAddress = profile.data.emailAddress;

    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Check if this email is already connected by this user
    const existingAccount = await ConnectedAccount.findOne({ userId, emailAddress });

    if (existingAccount) {
      // Update tokens (Google may omit refresh_token on re-consent — keep the old one)
      existingAccount.accessToken = tokens.access_token;
      if (tokens.refresh_token) existingAccount.refreshToken = tokens.refresh_token;
      existingAccount.tokenExpiry = tokenExpiry;
      existingAccount.isActive = true;

      // Best-effort re-watch (non-fatal — cron renews if it fails)
      const watch = await startGmailWatch(gmail, emailAddress);
      if (watch) {
        existingAccount.lastHistoryId = watch.historyId;
        if (watch.watchExpiry) existingAccount.watchExpiry = watch.watchExpiry;
      }
      await existingAccount.save();

      return succeed(emailAddress);
    }

    // Limit to max 3 accounts
    const accountCount = await ConnectedAccount.countDocuments({ userId });
    if (accountCount >= 3) {
      return fail("Maximum of 3 connected accounts reached");
    }

    // A refresh token is required to keep syncing after the access token expires.
    // With access_type=offline + prompt=consent Google should always return one,
    // but guard against the edge case rather than throwing an opaque DB error.
    if (!tokens.refresh_token) {
      return fail("Google did not return a refresh token — remove this app's access in your Google account, then reconnect");
    }

    // Best-effort watch before save (non-fatal — cron renews if it fails)
    const watch = await startGmailWatch(gmail, emailAddress);

    // Save in DB
    await ConnectedAccount.create({
      userId,
      provider: "google",
      emailAddress,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry,
      lastHistoryId: watch?.historyId,
      watchExpiry: watch?.watchExpiry,
      isActive: true,
    });

    return succeed(emailAddress);
  } catch (error) {
    logger.error("GoogleAuth", "Google callback error", error);
    return fail(`Connection failed: ${describeGoogleError(error)}`);
  }
};