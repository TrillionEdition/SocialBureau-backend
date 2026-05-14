const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
/**
 * ☁️ CLOUDFLARE R2 UPLOAD MIDDLEWARE
 * Using the R2 credentials from your .env file.
 */

if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET || !process.env.R2_PUBLIC_URL) {
  console.warn('Missing R2 env vars. Make sure R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL are set.');
}

// Helper to ensure URL has protocol
const ensureHttps = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
};

// Clean endpoint: handle protocol correctly
const rawEndpoint = process.env.R2_ENDPOINT || "";
const cleanEndpoint = ensureHttps(rawEndpoint.replace(/^https?:\/\//, "").split('/')[0]);

const r2 = new S3Client({
  region: 'us-east-1',
  endpoint: cleanEndpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const multerInstance = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG/PNG/WEBP images are allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

async function uploadToR2(file, folder = 'images') {
  const ext = path.extname(file.originalname) || '.jpg';
  const uuid = crypto.randomUUID();

  const rawPublicUrl = process.env.R2_PUBLIC_URL || '';
  const publicUrl = ensureHttps(rawPublicUrl).replace(/\/$/, '');
  const bucket = process.env.R2_BUCKET || '';

  // Clean folder path: remove leading/trailing slashes
  let cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  
  // If the folder starts with the bucket name followed by a slash, strip it
  if (cleanFolder === bucket) {
    cleanFolder = '';
  } else if (cleanFolder.startsWith(`${bucket}/`)) {
    cleanFolder = cleanFolder.substring(bucket.length + 1);
  }

  const key = cleanFolder ? `${cleanFolder}/${uuid}${ext}` : `${uuid}${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  const finalUrl = `${publicUrl}/${key}`;
  console.log("☁️ R2 UPLOAD SUCCESS:");
  console.log("   - Key:", key);
  console.log("   - Final URL:", finalUrl);

  file.location = finalUrl;
}

/**
 * 🗑️ DELETE FROM R2
 * Deletes an object from R2 given its public URL.
 */
async function deleteFromR2(fileUrl) {
  if (!fileUrl) return;

  try {
    const rawPublicUrl = process.env.R2_PUBLIC_URL || '';
    const publicUrl = ensureHttps(rawPublicUrl).replace(/\/$/, '');
    const bucket = process.env.R2_BUCKET || '';

    // Extract key from URL
    // URL format: https://public-url.com/folder/filename.ext
    // Key format: folder/filename.ext
    if (!fileUrl.startsWith(publicUrl)) {
      console.warn('⚠️ Skipping delete: URL does not match R2_PUBLIC_URL', { fileUrl, publicUrl });
      return;
    }

    const key = fileUrl.replace(`${publicUrl}/`, '');
    
    if (!key) return;

    await r2.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    console.log("🗑️ R2 DELETE SUCCESS:", key);
  } catch (err) {
    console.error("❌ R2 Delete Error:", err.message);
  }
}

function wrapUpload(multerMiddleware, folder) {
  return async function (req, res, next) {
    multerMiddleware(req, res, async (err) => {
      if (err) return next(err);
      try {
        if (req.file) {
          await uploadToR2(req.file, folder);
        }
        if (req.files) {
          const files = Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat();
          await Promise.all(files.map(f => uploadToR2(f, folder)));
        }
        next();
      } catch (uploadErr) {
        console.error("❌ R2 Upload Error:", uploadErr.message);
        next(uploadErr);
      }
    });
  };
}

const upload = {
  single: (fieldName, folder) => wrapUpload(multerInstance.single(fieldName), folder),
  array: (fieldName, maxCount, folder) => wrapUpload(multerInstance.array(fieldName, maxCount), folder),
  fields: (fields, folder) => wrapUpload(multerInstance.fields(fields), folder),
  any: (folder) => wrapUpload(multerInstance.any(), folder),
  deleteFromR2,
};

module.exports = upload;