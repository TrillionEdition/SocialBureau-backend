const axios = require('axios');

/**
 * Extracts structured JSON from raw resume text using Gemini API.
 * @param {string} rawText The raw text extracted from PDF.
 * @returns {Promise<Object>} The parsed structured JSON.
 */
async function extractResumeDataAI(rawText) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('No GEMINI_API_KEY found. Falling back to simple heuristic extraction.');
    throw new Error('AI API Key missing');
  }

  const prompt = `
You are a WORLD-CLASS ATS Resume Parser. Your mission is to extract every single detail from the provided raw resume text with 100% accuracy and format it into a professional, structured JSON.

### CRITICAL RULES:
1. **NO HALLUCINATION**: If a field (like phone or linkedin) is not in the text, return an empty string or null.
2. **PROFESSIONAL TITLE**: If no job title is explicitly stated at the top, deduce the most appropriate one (e.g., "Senior Full Stack Developer") based on the work experience.
3. **EXPERIENCE DETAILS**: Extract bullet points exactly as they appear. If no bullet points exist, summarize the responsibilities into clear, professional bullets.
4. **DATES**: Standardize all dates to "Month YYYY" or "YYYY" format (e.g., "Jan 2020", "2022"). Return "Present" for current roles.
5. **DURATION**: Calculate the duration (e.g., "2 yrs 4 mos") for each experience entry.
6. **SKILLS**: Separate Technical Skills (hard tools, languages) from Soft Skills (leadership, communication).
7. **CERTIFICATIONS**: Extract the full name of the certification and the issuing organization if available.
8. **EDUCATION**: Extract the full degree name (e.g., "Bachelor of Science in Computer Science") and the institution.

### OUTPUT STRUCTURE:
You MUST return ONLY a valid, minified JSON object matching this schema. NO markdown, NO commentary.

{
  "personalInfo": {
    "fullName": "Full Name",
    "title": "Professional Title",
    "email": "email@example.com",
    "phone": "Phone Number",
    "location": "City, Country",
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL",
    "portfolio": "Portfolio URL"
  },
  "summary": "Professional summary...",
  "skills": ["Skill 1", "Skill 2"],
  "softSkills": ["Soft Skill 1", "Soft Skill 2"],
  "experience": [
    {
      "jobTitle": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "startDate": "Start Date",
      "endDate": "End Date",
      "duration": "Duration",
      "description": ["Bullet 1", "Bullet 2"]
    }
  ],
  "projects": [
    {
      "title": "Project Title",
      "description": "Project Description",
      "technologies": ["Tech 1", "Tech 2"],
      "github": "Project GitHub",
      "liveLink": "Project Live Link"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "location": "Location",
      "startYear": "Start Date/Year",
      "endYear": "End Date/Year"
    }
  ],
  "certifications": ["Cert 1", "Cert 2"],
  "languages": ["Language 1 (Proficiency)"]
}

### RAW RESUME TEXT TO PARSE:
"""
${rawText}
"""
    `;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          responseMimeType: "application/json",
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const aiResponseText = response.data.candidates[0].content.parts[0].text;

    try {
      const parsed = JSON.parse(aiResponseText.trim());
      return normalizeAIData(parsed);
    } catch (err) {
      const cleanText = aiResponseText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleanText);
      return normalizeAIData(parsed);
    }
  } catch (error) {
    console.error('AI Extraction Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Normalizes the AI response to match the internal structure
 */
function normalizeAIData(data) {
  // Ensure personalInfo fields are correctly named if AI deviates
  if (data.personalInfo && data.personalInfo.name && !data.personalInfo.fullName) {
    data.personalInfo.fullName = data.personalInfo.name;
  }

  // Ensure lists are actually arrays
  const listFields = ['skills', 'softSkills', 'certifications', 'languages', 'projects', 'experience', 'education'];
  listFields.forEach(field => {
    if (!Array.isArray(data[field])) {
      data[field] = [];
    }
  });

  return data;
}

module.exports = {
  extractResumeDataAI
};

