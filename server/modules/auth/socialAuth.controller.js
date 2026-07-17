const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const User = require("../user/user.model");
const logger = require("../../utils/logger");
const { getGoogleOAuthClient } = require("../../services/google.service");
const {
  getMicrosoftAuthUrl,
  getMicrosoftTokens,
  getMicrosoftProfile,
} = require("../../services/microsoft.service");
const { generateToken, setAuthCookie } = require("../../utils/auth");

// Scopes for sign-in only (profile + email, NOT Gmail access)
const GOOGLE_SIGNIN_SCOPES = ["openid", "profile", "email"];
// ─── Google Sign-In ───────────────────────────────────────────────────────────
// GET /api/auth/google
exports.googleSignIn = (req, res) => {
  try {
    const oauthClient = getGoogleOAuthClient(
      process.env.GOOGLE_AUTH_REDIRECT_URI
    );

    const state = jwt.sign({ purpose: "google-auth" }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    const authUrl = oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: GOOGLE_SIGNIN_SCOPES,
      prompt: "select_account",
      state,
    });

    res.redirect(authUrl);
  } catch (error) {
    logger.error("SocialAuth", "Google sign-in redirect error", error);
    res.status(500).json({ message: "Google sign-in failed" });
  }
};

// ─── Google Callback ──────────────────────────────────────────────────────────
// GET /api/auth/google/callback
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ message: "Missing code or state." });
    }

    // Verify state to prevent CSRF
    try {
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      if (decoded.purpose !== "google-auth") throw new Error();
    } catch {
      return res.status(400).json({ message: "Invalid or expired state." });
    }

    const oauthClient = getGoogleOAuthClient(
      process.env.GOOGLE_AUTH_REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    // Fetch Google profile
    const oauth2 = google.oauth2({ version: "v2", auth: oauthClient });
    const { data: profile } = await oauth2.userinfo.get();
    // profile: { id, name, email, picture, ... }

    if (!profile.email) {
      return res.status(400).json({ message: "Could not retrieve email from Google." });
    }

    // Find or create user
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      // Check if email already registered locally
      user = await User.findOne({ email: profile.email });

      if (user) {
        // Link Google to existing local account
        user.googleId = profile.id;
        user.authProvider = "google";
        await user.save();
      } else {
        // Brand new user — create account
        user = await User.create({
          name: profile.name,
          email: profile.email,
          googleId: profile.id,
          authProvider: "google",
        });
      }
    }

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    // Redirect to frontend with token in query (frontend stores it)
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=google`
    );
  } catch (error) {
    logger.error("SocialAuth", "Google callback error", error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=google_failed`);
  }
};

// ─── Microsoft Sign-In ────────────────────────────────────────────────────────
// GET /api/auth/microsoft
exports.microsoftSignIn = (req, res) => {
  try {
    const state = jwt.sign(
      { purpose: "microsoft-auth" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    const authUrl = getMicrosoftAuthUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    logger.error("SocialAuth", "Microsoft sign-in redirect error", error);
    res.status(500).json({ message: "Microsoft sign-in failed" });
  }
};

// ─── Microsoft Callback ───────────────────────────────────────────────────────
// GET /api/auth/microsoft/callback
exports.microsoftCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ message: "Missing code or state." });
    }

    // Verify state to prevent CSRF
    try {
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      if (decoded.purpose !== "microsoft-auth") throw new Error();
    } catch {
      return res.status(400).json({ message: "Invalid or expired state." });
    }

    // Exchange code for tokens
    const tokenData = await getMicrosoftTokens(code);

    // Fetch Microsoft profile from Graph API
    const profile = await getMicrosoftProfile(tokenData.access_token);
    // profile: { id, displayName, mail, userPrincipalName, ... }

    const email = profile.mail || profile.userPrincipalName;

    if (!email) {
      return res.status(400).json({ message: "Could not retrieve email from Microsoft." });
    }

    // Find or create user
    let user = await User.findOne({ microsoftId: profile.id });

    if (!user) {
      // Check if email already registered locally
      user = await User.findOne({ email });

      if (user) {
        // Link Microsoft to existing local account
        user.microsoftId = profile.id;
        user.authProvider = "microsoft";
        await user.save();
      } else {
        // Brand new user — create account
        user = await User.create({
          name: profile.displayName,
          email,
          microsoftId: profile.id,
          authProvider: "microsoft",
        });
      }
    }

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=microsoft`
    );
  } catch (error) {
    logger.error("SocialAuth", "Microsoft callback error", error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=microsoft_failed`);
  }
};
