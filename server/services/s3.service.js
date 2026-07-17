const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;

/**
 * Upload a file buffer to S3.
 * @param {Buffer} fileBuffer - The file content
 * @param {string} originalName - Original filename (used to preserve extension)
 * @param {string} mimetype - MIME type of the file
 * @param {string} userId - Owner's user ID (used as folder prefix)
 * @param {string} [folder='resumes'] - S3 folder prefix (e.g. 'resumes', 'photos')
 * @returns {{ key: string, url: string }} - S3 object key and public URL
 */
exports.uploadToS3 = async (filePath, originalName, mimetype, userId, folder = "resumes") => {
  const ext = path.extname(originalName);
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const key = `${folder}/${userId}/${uniqueName}`;
  const fileStream = fs.createReadStream(filePath);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: mimetype,
    })
  );

  const url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { key, url };
};

/**
 * Delete a file from S3 by its key.
 * @param {string} key - The S3 object key to delete
 */
exports.deleteFromS3 = async (key) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};

/**
 * Generate a pre-signed URL for an S3 object.
 * @param {string} key - The S3 object key
 * @param {number} expiresIn - Expiry time in seconds (default 3600)
 * @returns {Promise<string>} - The pre-signed URL
 */
exports.getPresignedUrl = async (key, expiresIn = 3600) => {
  if (!key) return null;
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn });
};
