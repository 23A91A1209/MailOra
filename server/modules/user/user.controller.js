/**
 * User Controller
 *
 * Handles user profile management including:
 * - Profile retrieval and updates (basic info, sections, full profile)
 * - Photo and resume uploads (S3)
 * - Resume AI extraction (Gemini)
 * - Password changes
 * - Mobile OTP verification (WhatsApp)
 */

const { extractProfileData } = require("../../services/gemini.service");
const { uploadToS3, deleteFromS3, getPresignedUrl } = require("../../services/s3.service");
const User = require("./user.model");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const axios = require("axios");
const logger = require("../../utils/logger");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess, sendError } = require("../../utils/apiResponse");
const { generateOtp } = require("../../utils/crypto");

/**
 * Merge `incoming` items into `existing`, skipping any incoming item whose
 * content signature (built from `keys`) already exists. Preserves existing
 * entries (including their _id and anything the user added manually).
 */
function mergeUnique(existing = [], incoming = [], keys = []) {
  const sig = (o) => keys.map((k) => (o?.[k] || "").toString().trim().toLowerCase()).join("|");
  const seen = new Set(existing.map(sig));
  const merged = [...existing];
  for (const item of incoming) {
    const s = sig(item);
    if (!seen.has(s)) {
      seen.add(s);
      merged.push(item);
    }
  }
  return merged;
}

// ─── GET /api/user/me ────────────────────────────────────────────────────────
// Returns the full user profile (structured for the frontend)
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, 404, "User not found");

  const photoUrl = user.photoS3Key ? await getPresignedUrl(user.photoS3Key) : user.photoUrl || "";
  const resumeUrl = user.resumeS3Key ? await getPresignedUrl(user.resumeS3Key) : user.resumeUrl || null;

  // Shape the response to match frontend expectations
  res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      photo: photoUrl,
    },
    basicInfo: {
      name:         user.name || "",
      countryCode:  user.countryCode || "+91",
      mobileNumber: user.mobileNumber || "",
      isMobileVerified: user.isMobileVerified || false,
      email:        user.email,
      role:         user.role || "",
      photo:        photoUrl,
    },
    profileData: {
      about:          user.about || "",
      skills:         user.skills || [],
      education:      user.education || [],
      projects:       user.projects || [],
      experience:     user.experience || [],
      certifications: user.certifications || [],
      codingProfiles: user.codingProfiles || { github: "", leetcode: "", codechef: "" },
      achievements:   user.achievements || "",
      connectedMails: user.connectedMails || [],
    },
    resumeUrl: resumeUrl,
  });
});

// ─── PUT /api/user/basic ─────────────────────────────────────────────────────
// Update basic info (name, countryCode, mobileNumber, email, role)
exports.updateBasicInfo = asyncHandler(async (req, res) => {
  const { name, countryCode, mobileNumber, email, role } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, 404, "User not found");

  if (name !== undefined) {
    user.name = name;
    user.firstName = name.split(" ")[0] || "";
    user.lastName = name.split(" ").slice(1).join(" ") || "";
  }
  if (countryCode !== undefined)  user.countryCode = countryCode;
  if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
  if (role !== undefined)         user.role = role;

  // Email change (only if different and not taken)
  if (email && email !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 400, "Email already in use");
    }
    user.email = email.toLowerCase();
  }

  await user.save();
  sendSuccess(res, 200, "Basic info updated", { user });
});

// ─── PUT /api/user/profile ───────────────────────────────────────────────────
// Update all profile data sections at once
exports.updateProfileData = asyncHandler(async (req, res) => {
  const {
    about, skills, education, projects,
    experience, certifications, codingProfiles,
    achievements, connectedMails
  } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, 404, "User not found");

  if (about !== undefined)          user.about = about;
  if (skills !== undefined)         user.skills = skills;
  if (education !== undefined)      user.education = education;
  if (projects !== undefined)       user.projects = projects;
  if (experience !== undefined)     user.experience = experience;
  if (certifications !== undefined) user.certifications = certifications;
  if (achievements !== undefined)   user.achievements = achievements;
  if (connectedMails !== undefined) user.connectedMails = connectedMails;

  if (codingProfiles !== undefined) {
    user.codingProfiles = {
      github:   codingProfiles.github   || user.codingProfiles.github,
      leetcode: codingProfiles.leetcode || user.codingProfiles.leetcode,
      codechef: codingProfiles.codechef || user.codingProfiles.codechef,
    };
  }

  await user.save();
  sendSuccess(res, 200, "Profile updated", { user });
});

// ─── PUT /api/user/section/:section ──────────────────────────────────────────
// Update a single profile section (skills, education, experience, etc.)
exports.updateSection = asyncHandler(async (req, res) => {
  const { section } = req.params;
  const { data } = req.body;

  const allowedSections = [
    "about", "skills", "education", "projects",
    "experience", "certifications", "codingProfiles",
    "achievements", "connectedMails"
  ];

  if (!allowedSections.includes(section)) {
    return sendError(res, 400, `Invalid section: ${section}`);
  }

  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, 404, "User not found");

  user[section] = data;
  await user.save();

  sendSuccess(res, 200, `${section} updated`, { [section]: user[section] });
});

// ─── POST /api/user/upload-photo ─────────────────────────────────────────────
// Upload profile photo to S3
exports.uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 400, "Please upload an image file.");
  }

  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, 404, "User not found");

  // Delete old photo from S3 if exists
  if (user.photoS3Key) {
    try {
      await deleteFromS3(user.photoS3Key);
    } catch (e) {
      logger.warn("User", "Failed to delete old photo from S3", e.message);
    }
  }

  try {
    // Upload new photo
    const { url, key } = await uploadToS3(
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      req.user._id.toString(),
      "photos" // folder prefix
    );

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    user.photoUrl = url;
    user.photoS3Key = key;
    await user.save();

    const presignedUrl = await getPresignedUrl(key);
    sendSuccess(res, 200, "Photo uploaded", { photoUrl: presignedUrl });
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw err;
  }
});

// ─── POST /api/user/upload-resume ────────────────────────────────────────────
// Upload resume to S3, extract text, parse skills, optionally fill profile
exports.uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 400, "Please upload a PDF or DOCX file.");
  }

  const fileBuffer = fs.readFileSync(req.file.path);
  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, 404, "User not found");

  // Delete old resume from S3 if exists
  if (user.resumeS3Key) {
    try {
      await deleteFromS3(user.resumeS3Key);
    } catch (e) {
      logger.warn("User", "Failed to delete old resume from S3", e.message);
    }
  }

  // Extract text from resume
  let extractedText;
  if (req.file.mimetype === "application/pdf") {
    const parsed = await pdfParse(fileBuffer);
    extractedText = parsed.text;
  } else {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    extractedText = result.value;
  }

  // Extract full profile data via Gemini AI
  let extractedData = {};
  try {
    extractedData = await extractProfileData(extractedText);
  } catch (e) {
    logger.warn("User", "Gemini extraction failed, using fallback", e.message);
    // Fallback: basic keyword matching for skills and role
    const possibleSkills = [
      "React", "JavaScript", "Node.js", "Express", "MongoDB", "Python",
      "Java", "C++", "SQL", "Git", "Docker", "AWS", "TypeScript",
      "HTML", "CSS", "Figma", "Tailwind", "Next.js", "GraphQL",
      "Redis", "PostgreSQL", "Firebase", "Flutter", "Kotlin", "Swift"
    ];
    const textLC = extractedText.toLowerCase();
    extractedData.skills = possibleSkills.filter(s => textLC.includes(s.toLowerCase()));

    let fallbackRole = "";
    if (textLC.includes("frontend") || textLC.includes("react")) fallbackRole = "Frontend Developer";
    else if (textLC.includes("backend") || textLC.includes("node")) fallbackRole = "Backend Developer";
    else if (textLC.includes("full stack") || textLC.includes("fullstack")) fallbackRole = "Full Stack Developer";
    else if (textLC.includes("data") || textLC.includes("machine learning")) fallbackRole = "Data Scientist";
    extractedData.role = fallbackRole;
  }

  try {
    // Upload to S3
    const { url, key } = await uploadToS3(
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      req.user._id.toString()
    );

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    // Save S3 details to user profile
    user.resumeUrl = url;
    user.resumeS3Key = key;
    user.extractedSkills = extractedData.skills || [];

    // Merge extracted data into profile (if present and user hasn't filled them out heavily)
    if (extractedData.skills && Array.isArray(extractedData.skills)) {
      user.skills = [...new Set([...user.skills, ...extractedData.skills])];
    }
    if (extractedData.role && !user.role) {
      user.role = extractedData.role;
    }
    if (extractedData.about && !user.about) {
      user.about = extractedData.about;
    }
    if (extractedData.achievements && !user.achievements) {
      user.achievements = extractedData.achievements;
    }
    // Merge extracted list sections without creating duplicates. Re-uploading a
    // resume should refresh these sections, not accumulate identical entries
    // (which previously caused education/projects/certs to pile up on each upload).
    if (extractedData.experience && Array.isArray(extractedData.experience) && extractedData.experience.length > 0) {
      user.experience = mergeUnique(user.experience, extractedData.experience, ["role", "company", "duration"]);
    }
    if (extractedData.education && Array.isArray(extractedData.education) && extractedData.education.length > 0) {
      user.education = mergeUnique(user.education, extractedData.education, ["degree", "institution", "year"]);
    }
    if (extractedData.projects && Array.isArray(extractedData.projects) && extractedData.projects.length > 0) {
      user.projects = mergeUnique(user.projects, extractedData.projects, ["title", "description"]);
    }
    if (extractedData.certifications && Array.isArray(extractedData.certifications) && extractedData.certifications.length > 0) {
      user.certifications = mergeUnique(user.certifications, extractedData.certifications, ["name", "issuer", "year"]);
    }

    await user.save();

    const presignedUrl = await getPresignedUrl(key);

    sendSuccess(res, 200, "Resume processed and uploaded", {
      resumeUrl: presignedUrl,
      profileData: {
        about: user.about,
        skills: user.skills,
        education: user.education,
        experience: user.experience,
        projects: user.projects,
        certifications: user.certifications,
        achievements: user.achievements,
      },
      basicInfo: {
        role: user.role,
      },
    });
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw err;
  }
});

// ─── PUT /api/user/change-password ───────────────────────────────────────────
// Change password (requires current password)
exports.changePassword = asyncHandler(async (req, res) => {
  const { current, new: newPwd, confirm } = req.body;

  if (!current || !newPwd || !confirm) {
    return sendError(res, 400, "All password fields are required");
  }

  if (newPwd !== confirm) {
    return sendError(res, 400, "New passwords do not match");
  }

  if (newPwd.length < 6) {
    return sendError(res, 400, "Password must be at least 6 characters");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) return sendError(res, 404, "User not found");

  if (user.authProvider !== "local") {
    return sendError(res, 400, `Password change is not available for ${user.authProvider} accounts`);
  }

  const isMatch = await bcrypt.compare(current, user.password);
  if (!isMatch) {
    return sendError(res, 400, "Current password is incorrect");
  }

  user.password = await bcrypt.hash(newPwd, 10);
  await user.save();

  sendSuccess(res, 200, "Password updated successfully");
});

// ─── Legacy: UPDATE profile (mobile + preferences) ──────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const { mobileNumber, countryCode, reminderPreferences } = req.body;
  const user = await User.findById(req.user._id);

  if (mobileNumber) user.mobileNumber = mobileNumber;
  if (countryCode) user.countryCode = countryCode;
  if (reminderPreferences) user.reminderPreferences = reminderPreferences;

  await user.save();
  sendSuccess(res, 200, "Profile updated", { user });
});

// ─── POST /api/user/send-mobile-otp ─────────────────────────────────────────
// Sends a 6-digit OTP via WhatsApp to the given phone number
exports.sendMobileOtp = asyncHandler(async (req, res) => {
  const { countryCode, mobileNumber } = req.body;

  if (!countryCode || !mobileNumber) {
    return sendError(res, 400, "Country code and mobile number are required.");
  }

  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, 404, "User not found");

  // Check if this number is already used by another account
  const rawNumber = mobileNumber.replace(/[\s\-\(\)]/g, "");
  const existingUser = await User.findOne({
    mobileNumber: rawNumber,
    _id: { $ne: req.user._id }
  });
  if (existingUser) {
    return sendError(res, 400, "This mobile number is already linked to another account.");
  }

  // Generate cryptographically secure 6-digit OTP
  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.mobileOtp = hashedOtp;
  user.mobileOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  user.countryCode = countryCode;
  user.mobileNumber = rawNumber;
  user.isMobileVerified = false;
  try {
    await user.save();
  } catch (saveErr) {
    if (saveErr.code === 11000) {
      return sendError(res, 400, "This mobile number is already linked to another account.");
    }
    throw saveErr;
  }

  // Send OTP via WhatsApp microservice
  const whatsappUrl = process.env.WHATSAPP_SERVICE_URL || "https://whatsapp.mail-or-a.dev";
  const fullNumber = countryCode.replace("+", "") + rawNumber;

  try {
    await axios.post(`${whatsappUrl}/api/send`, {
      number: fullNumber,
      message: `🔐 Your Mail-or-a verification OTP is: *${otp}*\n\nThis code expires in 5 minutes. Do not share it with anyone.`
    });
  } catch (whatsappErr) {
    logger.error("User", "WhatsApp send failed", whatsappErr.message);
    return sendError(res, 500, "Failed to send OTP via WhatsApp. Please ensure the WhatsApp service is running.");
  }

  sendSuccess(res, 200, "OTP sent to your WhatsApp number.");
});

// ─── POST /api/user/verify-mobile-otp ────────────────────────────────────────
// Verifies the WhatsApp OTP and marks the mobile as verified
exports.verifyMobileOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return sendError(res, 400, "OTP is required.");
  }

  const user = await User.findById(req.user._id).select("+mobileOtp +mobileOtpExpiry");
  if (!user) return sendError(res, 404, "User not found");

  if (!user.mobileOtp || !user.mobileOtpExpiry) {
    return sendError(res, 400, "No OTP request found. Please request a new OTP.");
  }

  if (user.mobileOtpExpiry < new Date()) {
    return sendError(res, 400, "OTP has expired. Please request a new one.");
  }

  const isMatch = await bcrypt.compare(otp, user.mobileOtp);
  if (!isMatch) {
    return sendError(res, 400, "Invalid OTP.");
  }

  user.isMobileVerified = true;
  user.mobileOtp = undefined;
  user.mobileOtpExpiry = undefined;
  await user.save();

  sendSuccess(res, 200, "Mobile number verified successfully!", {
    mobileNumber: user.mobileNumber,
    countryCode: user.countryCode,
    isMobileVerified: true,
  });
});
