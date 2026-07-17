/**
 * Microsoft OAuth Service
 *
 * Currently used for: Microsoft account sign-in (authentication only).
 *
 * Future Scope: Extend with getOutlookClient() and listMessages() methods
 * to support Microsoft Outlook/Office 365 email ingestion via the Graph API.
 * The ConnectedAccount model and Kafka email-classification pipeline are
 * already provider-agnostic, so Outlook emails will flow through the same
 * AI classification → storage → reminder pipeline with zero changes.
 */
const axios = require("axios");

const TENANT = "common"; // supports personal + work/school accounts
const AUTH_BASE = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;

/**
 * Build Microsoft OAuth authorization URL
 */
exports.getMicrosoftAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    scope: "openid profile email User.Read",
    response_mode: "query",
    state,
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 */
exports.getMicrosoftTokens = async (code) => {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const response = await axios.post(`${AUTH_BASE}/token`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data; // { access_token, refresh_token, expires_in, ... }
};

/**
 * Fetch Microsoft user profile from Graph API
 */
exports.getMicrosoftProfile = async (accessToken) => {
  const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data; // { id, displayName, mail, userPrincipalName, ... }
};
