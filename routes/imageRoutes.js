const express = require("express");
const sharp = require("sharp");

const { upload, sendBuffer } = require("../utils/multerUtils");

const router = express.Router();

// ─── RESIZE ───────────────────────────────────────────────────────────────
router.post("/resize", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const width = Math.max(1, parseInt(req.body.width, 10));
    const height = Math.max(1, parseInt(req.body.height, 10));
    if (!width || !height) {
      return res.status(400).json({ message: "width and height required" });
    }
    const meta = await sharp(req.file.buffer).metadata();
    const fmt = (meta.format || "png").toLowerCase();
    const buf = await sharp(req.file.buffer)
      .resize(width, height, { fit: "fill" })
      .toFormat(fmt === "jpg" ? "jpeg" : fmt)
      .toBuffer();
    const ext = fmt === "jpeg" ? "jpg" : fmt;
    sendBuffer(res, buf, `resized.${ext}`, `image/${ext}`);
  } catch (err) {
    next(err);
  }
});

// ─── COMPRESS ─────────────────────────────────────────────────────────────
router.post("/compress", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const quality = Math.max(
      1,
      Math.min(95, parseInt(req.body.quality, 10) || 70)
    );
    const buf = await sharp(req.file.buffer)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    sendBuffer(res, buf, "compressed.jpg", "image/jpeg");
  } catch (err) {
    next(err);
  }
});

// ─── CONVERT FORMAT ───────────────────────────────────────────────────────
router.post("/convert", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const target = (req.body.target || "png").toLowerCase();
    const map = { png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp", bmp: "png" };
    const fmt = map[target];
    if (!fmt) return res.status(400).json({ message: "Unsupported target format" });
    const buf = await sharp(req.file.buffer).toFormat(fmt).toBuffer();
    sendBuffer(res, buf, `converted.${target}`, `image/${target}`);
  } catch (err) {
    next(err);
  }
});

// ─── ROTATE ───────────────────────────────────────────────────────────────
router.post("/rotate", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const angle = parseFloat(req.body.angle) || 90;
    const meta = await sharp(req.file.buffer).metadata();
    const fmt = (meta.format || "png").toLowerCase();
    const buf = await sharp(req.file.buffer)
      .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFormat(fmt === "jpg" ? "jpeg" : fmt)
      .toBuffer();
    const ext = fmt === "jpeg" ? "jpg" : fmt;
    sendBuffer(res, buf, `rotated.${ext}`, `image/${ext}`);
  } catch (err) {
    next(err);
  }
});

// ─── GRAYSCALE ────────────────────────────────────────────────────────────
router.post("/grayscale", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const buf = await sharp(req.file.buffer).grayscale().png().toBuffer();
    sendBuffer(res, buf, "grayscale.png", "image/png");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
