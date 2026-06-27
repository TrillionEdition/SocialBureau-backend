const express = require("express");
const router = express.Router();
const Anthropic = require("@anthropic-ai/sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

// ── POST /api/ai/image ─────────────────────────────────────────────────────────
// Generates industrial visuals using Gemini Imagen model
router.post("/image", async (req, res, next) => {
  try {
    const { prompt, style } = req.body || {};
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: "prompt required" });
    }
    if (!GEMINI_KEY) {
      return res.status(500).json({ message: "GEMINI_API_KEY not configured" });
    }

    const styleStr = style || "photorealistic industrial photography, sharp focus, dramatic lighting";
    const fullPrompt = `Generate a high-quality industrial visual: ${prompt}. Style: ${styleStr}. Aspect: 16:9. Avoid watermarks and text overlays.`;

    const candidateModels = [
      process.env.GEMINI_IMAGE_MODEL,
      "gemini-2.5-flash-image",
      "gemini-3.1-flash-image",
      "imagen-3.0-generate-002",
      "gemini-2.5-flash-image-preview"
    ].filter(Boolean);

    let imageBase64 = null;
    let mimeType = "image/png";
    let captionText = "";
    let lastError = null;

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);

    for (const modelName of candidateModels) {
      try {
        console.log(`[aiProxy] Attempting image generation with model: ${modelName}`);
        
        if (modelName.startsWith("imagen-")) {
          // For legacy Imagen models
          const model = genAI.getGenerativeModel({ model: modelName });
          const imgResult = await model.generateImages({
            prompt: fullPrompt,
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "16:9",
          });
          const imageBytes = imgResult.generatedImages?.[0]?.image?.imageBytes;
          if (imageBytes) {
            imageBase64 = imageBytes;
            mimeType = "image/jpeg";
            break;
          }
        } else {
          // For Gemini native image models
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          });
          const result = await model.generateContent(fullPrompt);
          const parts = result?.response?.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              imageBase64 = part.inlineData.data;
              mimeType = part.inlineData.mimeType || mimeType;
            } else if (part.text) {
              captionText += part.text;
            }
          }
          if (imageBase64) {
            break;
          }
        }
      } catch (err) {
        console.warn(`[aiProxy] Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!imageBase64) {
      const errMsg = lastError?.message || "No image returned by any candidate model";
      return res.status(502).json({ message: `Image generation failed: ${errMsg}` });
    }

    res.json({
      image_base64: imageBase64,
      mime_type: mimeType,
      caption: captionText.trim() || prompt,
    });
  } catch (err) {
    console.error("[aiProxy] Image generation error:", err);
    res.status(502).json({ message: `Image generation failed: ${err.message}` });
  }
});

// ── POST /api/ai/prompt ────────────────────────────────────────────────────────
// Generates prompt structures and copy using Claude (if key available) or Gemini
router.post("/prompt", async (req, res, next) => {
  try {
    const {
      topic,
      use_case = "industrial_marketing",
      details = "",
      tone = "technical",
    } = req.body || {};

    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: "topic required" });
    }

    const systemPrompt =
      "You are SocialBureau's industrial prompt engineer. Generate clear, " +
      "detailed, actionable prompts and copy for industrial / production / " +
      "manufacturing use cases. Output should be structured, professional, " +
      "and immediately usable.";

    const userText =
      `Use case: ${use_case}\n` +
      `Topic: ${topic}\n` +
      `Extra details: ${details || "none"}\n` +
      `Tone: ${tone}\n\n` +
      "Deliver:\n" +
      "1. A single optimized AI prompt (for image or copy generation).\n" +
      "2. 3 alternative variations.\n" +
      "3. Key keywords to include.\n" +
      "Format with clear markdown headings.";

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      // Use Claude Sonnet if key is configured
      const client = new Anthropic({ apiKey: anthropicKey });
      const message = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userText }],
      });

      const output = (message.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      return res.json({ output });
    } else {
      // Fallback to Gemini if no Anthropic key is configured
      if (!GEMINI_KEY) {
        return res.status(500).json({ message: "GEMINI_API_KEY not configured" });
      }

      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + userText }] }
        ]
      });

      const output = result.response.text().trim();
      return res.json({ output });
    }
  } catch (err) {
    console.error("[aiProxy] Prompt generation error:", err);
    res.status(502).json({ message: `Prompt generation failed: ${err.message}` });
  }
});

module.exports = router;
