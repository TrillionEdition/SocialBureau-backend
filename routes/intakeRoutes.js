const express = require("express");
const router = express.Router();
const intake = require("../models/intake");

router.post("/api/submit-intake", async (req, res) => {
  try {
    await intake.create(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;