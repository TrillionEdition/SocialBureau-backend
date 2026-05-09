const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
/**
 * ☁️ CLOUDFLARE R2 UPLOAD MIDDLEWARE
 * Using the R2 credentials from your .env file.
 */

if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET || !process.env.R2_PUBLIC_URL) {
  console.warn('⚠️ MAILER: Missing R2 env vars. Image uploads might fail.');
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: (() => {
    const raw = (process.env.R2_ENDPOINT || '').trim();
    // Aggressively strip protocol, bucket path, and common prefixes
    let host = raw.split('/')[0].replace(/^https?:\/\//, '');
    
    // Remove "Cloudflarestorage" if it was accidentally prepended to the ID
    if (host.toLowerCase().startsWith('cloudflarestorage')) {
       host = host.replace(/^cloudflarestorage/i, '');
    }
    
    const finalEndpoint = `https://${host}`;
    console.log('--------------------------------------------------');
    console.log(`📡 [R2 CONNECTION] URL: ${finalEndpoint}`);
    console.log('--------------------------------------------------');
    return finalEndpoint;
  })(),
  forcePathStyle: true,
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

async function uploadToR2(file) {
  const ext = path.extname(file.originalname) || '.jpg';
  const uuid = crypto.randomUUID();

  const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  const bucket = process.env.R2_BUCKET || '';
  
  // Ensure we have a clean public URL base
  let urlBase = publicUrl.startsWith('http') ? publicUrl : `https://${publicUrl}`;
  
  // Check if bucket name is already in publicUrl, if not, add it
  if (!urlBase.includes(bucket)) {
    urlBase = `${urlBase}/${bucket}`;
  }
  
  const key = `images/${uuid}${ext}`;
  
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  // Standardize the location for the controller
  file.location = `${urlBase}/${key}`;
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
        console.error("❌ R2 Upload Error:", uploadErr.message);
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