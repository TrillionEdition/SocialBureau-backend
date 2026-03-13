const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set. AI features will be disabled.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const generationConfig = {
  temperature: 0.2,
  topP: 0.8,
  topK: 20,
  maxOutputTokens: 4096,
  responseMimeType: "application/json",
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Invokes the Gemini model with a specific prompt and returns structured JSON.
 * @param {string} prompt The prompt to send to the AI model.
 * @returns {Promise<Object>} The parsed JSON response from the AI.
 */
async function invokeGemini(prompt) {
  if (!genAI) {
    throw new Error('Gemini AI is not initialized. Check API key.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig, safetySettings });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().replace(/```json\n|```/g, '').trim();

    try {
      return JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse Gemini's JSON response:", jsonText);
      throw new Error('AI returned invalid JSON. Please try again.');
    }
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw new Error('Failed to get a response from the AI. Please check your connection or API key.');
  }
}

/**
 * Invokes the Gemini model and returns plain text.
 * @param {string} prompt The prompt to send to the AI model.
 * @returns {Promise<string>} The text response.
 */
async function invokeGeminiText(prompt) {
  if (!genAI) {
    throw new Error('Gemini AI is not initialized. Check API key.');
  }

  try {
    const textConfig = { ...generationConfig };
    delete textConfig.responseMimeType; // Allow plain text

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: textConfig,
      safetySettings
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini Text API call failed:', error);
    throw new Error('Failed to get a text response from the AI.');
  }
}

module.exports = { invokeGemini, invokeGeminiText };
