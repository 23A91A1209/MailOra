// services/google.service.js

const { google } = require("googleapis");

/**
 * Create OAuth2 client
 * @param {string} [redirectUri] - override redirect URI (defaults to GOOGLE_REDIRECT_URI for Gmail connection)
 */
exports.getGoogleOAuthClient = (redirectUri) => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || process.env.GOOGLE_REDIRECT_URI
  );
};

/**
 * Returns Gmail API instance
 */
exports.getGmailClient = (oauthClient) => {
  return google.gmail({
    version: "v1",
    auth: oauthClient,
  });
};

/**
 * Automatically refresh token if expired
 * Updates DB with new access token
 */
exports.refreshGoogleTokenIfNeeded = async (account) => {
  const oauthClient = exports.getGoogleOAuthClient();

  oauthClient.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  // If token expired → refresh
  if (!account.tokenExpiry || new Date() >= account.tokenExpiry) {
    const { credentials } = await oauthClient.refreshAccessToken();

    account.accessToken = credentials.access_token;

    if (credentials.expiry_date) {
      account.tokenExpiry = new Date(credentials.expiry_date);
    }

    await account.save();
  }

  return oauthClient;
};