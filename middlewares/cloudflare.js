const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

async function uploadToR2(file) {
  const ext = path.extname(file.originalname) || '.jpg';
  const uuid = crypto.randomUUID();

  const rawPublicUrl = process.env.R2_PUBLIC_URL || '';
  const publicUrl = ensureHttps(rawPublicUrl).replace(/\/$/, '');
  const bucket = process.env.R2_BUCKET || '';
  
  // Logic to build the final URL correctly
  const urlBase = publicUrl; 

  const key = `images/${uuid}${ext}`;
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

function wrapUpload(multerMiddleware) {
  return async function (req, res, next) {
    multerMiddleware(req, res, async (err) => {
      if (err) return next(err);
      try {
        if (req.file) {
          await uploadToR2(req.file);
        }
        if (req.files) {
          const files = Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat();
          await Promise.all(files.map(uploadToR2));
        }
        next();
      } catch (uploadErr) {
        next(uploadErr);
      }
    });
  };
}

const upload = {
  single: (fieldName) => wrapUpload(multerInstance.single(fieldName)),
  array: (fieldName, maxCount) => wrapUpload(multerInstance.array(fieldName, maxCount)),
  fields: (fields) => wrapUpload(multerInstance.fields(fields)),
  any: () => wrapUpload(multerInstance.any()),
};

module.exports = upload;