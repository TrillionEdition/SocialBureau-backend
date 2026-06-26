const express = require("express");
const router = express.Router();
// Trigger restart to reload env
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent`;

// ── POST /api/ai/claude ────────────────────────────────────────────────────────
// Accepts the same body shape the frontend already sends (Anthropic format)
// and translates it to Gemini format internally.
router.post("/claude", async (req, res) => {
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  const { messages, max_tokens = 1000 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required." });
  }

  // Translate Anthropic message format → Gemini format
  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : m.content?.[0]?.text || "" }],
  }));

  const geminiBody = {
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: max_tokens,
      temperature: 0.7,
    },
  };

  try {
    const upstream = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      const errMsg = data.error?.message || "Gemini API error";
      console.error("[aiProxy] Gemini error:", errMsg);
      return res.status(upstream.status).json({ error: errMsg });
    }

    // Translate Gemini response → Anthropic response shape
    // so the frontend needs zero changes
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.json({
      content: [{ type: "text", text }],
    });

  } catch (err) {
    console.error("[aiProxy] fetch error:", err);
    return res.status(500).json({ error: "Failed to reach Gemini API." });
  }
});

module.exports = router;
