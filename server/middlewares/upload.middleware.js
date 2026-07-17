const multer = require("multer");

const os = require("os");

// Use disk storage — file is saved temporarily to the OS temp directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Resume upload — PDF and DOCX only, 5MB max
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX allowed"), false);
    }
  },
});

// Photo upload — images only, 3MB max
const photoUpload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images allowed"), false);
    }
  },
});

module.exports = upload;
module.exports.photoUpload = photoUpload;