const express = require("express");
const router = express.Router();
const intake = require("../models/intake");
const upload = require("../middlewares/cloudflare");

// Accept files (any field name) and upload to Cloudflare R2 via middleware
router.post("/api/submit-intake", upload.any(), async (req, res) => {
  try {
    const payload = { ...req.body };

    // Attach uploaded files metadata/URLs if present
    if (req.files && req.files.length > 0) {
      payload.files = req.files.map(f => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        url: f.location || null,
      }));
    }

    await intake.create(payload);
    res.json({ ok: true });
  } catch (err) {
    console.error('Intake submit error:', err);
    res.status(500).json({ error: err.message });
  }
});
// GET all submissions
router.get("/api/intakes", async (req, res) => {
  const docs = await intake.find().sort({ createdAt: -1 }).limit(500);
  res.json(docs);
});


module.exports = router;