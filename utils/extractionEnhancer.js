const axios = require('axios');

/**
 * Comprehensive soft skills list for detection
 */
const SOFT_SKILLS = {
  communication: ['communication', 'presentation', 'public speaking', 'negotiation', 'articulate', 'persuasion', 'storytelling', 'rhetoric'],
  leadership: ['leadership', 'management', 'delegation', 'mentor', 'coaching', 'team lead', 'direction', 'vision', 'strategic'],
  teamwork: ['teamwork', 'collaboration', 'team player', 'cooperative', 'cross-functional', 'collective', 'synergy'],
  problemSolving: ['problem solving', 'analytical', 'critical thinking', 'solution-oriented', 'troubleshooting', 'debugging', 'logical', 'reasoning'],
  creativity: ['creativity', 'creative', 'innovation', 'innovative', 'design thinking', 'brainstorming', 'originality', 'artistic'],
  adaptability: ['adaptability', 'flexible', 'adaptable', 'agile', 'versatile', 'resilient', 'quick learner', 'responsive'],
  workEthic: ['work ethic', 'hardworking', 'dedicated', 'commitment', 'reliable', 'accountable', 'responsible', 'diligent', 'punctual'],
  timeManagement: ['time management', 'organizational', 'organized', 'prioritization', 'deadline-driven', 'efficient', 'productive'],
  emotionalIntelligence: ['emotional intelligence', 'empathy', 'interpersonal', 'relationship building', 'self-awareness', 'social skills'],
  decisionMaking: ['decision making', 'judgment', 'analytical decision', 'strategic thinking', 'planning', 'forecasting'],
  customerService: ['customer service', 'customer-focused', 'client relations', 'relationship management', 'customer satisfaction'],
  conflictResolution: ['conflict resolution', 'mediation', 'diplomacy', 'negotiation skills', 'de-escalation']
};

/**
 * Extract soft skills from resume text
 */
function extractSoftSkills(text) {
  const softSkills = new Map();
  const textLower = text.toLowerCase();
  
  for (const [skillCategory, keywords] of Object.entries(SOFT_SKILLS)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        const displayName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        if (!softSkills.has(skillCategory)) {
          softSkills.set(skillCategory, displayName);
        }
      }
    }
  }
  
  return Array.from(softSkills.values());
}

/**
 * Extract hard technical skills with categories
 */
function extractTechnicalSkills(text) {
  const technicalKeywords = {
    programming: ['javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'golang', 'rust', 'kotlin', 'swift', 'typescript', 'perl', 'scala', 'groovy'],
    frontend: ['react', 'vue', 'angular', 'angular.js', 'ember', 'backbone', 'next.js', 'nuxt', 'svelte', 'html', 'css', 'sass', 'less', 'tailwind'],
    backend: ['node.js', 'express', 'django', 'flask', 'spring', 'spring boot', 'laravel', 'asp.net', 'fastapi', 'rails', 'gin'],
    database: ['mongodb', 'mysql', 'postgresql', 'oracle', 'sql server', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'firebase'],
    cloudPlatforms: ['aws', 'azure', 'google cloud', 'gcp', 'heroku', 'vercel', 'digitalocean'],
    devops: ['docker', 'kubernetes', 'jenkins', 'gitlab', 'github', 'circleci', 'terraform', 'ansible', 'helm'],
    tools: ['git', 'jira', 'confluence', 'slack', 'trello', 'figma', 'sketch', 'adobe'],
    dataAnalysis: ['tableau', 'power bi', 'excel', 'sql analysis', 'data mining', 'statistical analysis'],
    machineLearning: ['machine learning', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'nlp', 'computer vision']
  };

  const skills = new Map();
  const textLower = text.toLowerCase();
  
  for (const [category, items] of Object.entries(technicalKeywords)) {
    for (const skill of items) {
      if (textLower.includes(skill)) {
        if (!skills.has(skill)) {
          skills.set(skill, category);
        }
      }
    }
  }
  
  return Array.from(skills.keys());
}

/**
 * Extract key achievements and metrics from text
 */
function extractAchievements(text) {
  const achievements = [];
  
  // Look for quantified achievements
  const metricPatterns = [
    /(?:increased|improved|boosted|grew|expanded|achieved|delivered|generated|saved|reduced|decreased)\s+[\w\s]*\s+(?:by\s+)?(\d+%|\d+x|[$€£€]\d+[MK]?)/gi,
    /(?:led|managed|directed|oversaw|coordinated)\s+(?:a\s+)?team\s+(?:of\s+)?(\d+)/gi,
    /(?:served|supported|assisted)\s+(\d+[\w\s]*(?:customers|clients|users))/gi,
    /(?:processed|handled|managed)\s+(?:over\s+)?(\d+[\w\s]*(?:transactions|requests|records))/gi
  ];
  
  for (const pattern of metricPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const achievement = match[0].trim();
      if (achievement.length > 10 && !achievements.includes(achievement)) {
        achievements.push(achievement);
      }
    }
  }
  
  return achievements.slice(0, 10);
}

/**
 * Extract certifications with dates if available
 */
function extractDetailedCertifications(text) {
  const certifications = [];
  
  const certPatterns = [
    /(?:certified|certificate|credential|certification in)\s+([A-Za-z\s\+\#\.\-]+?)(?:\s*[,\n]|$)/gi,
    /([A-Za-z\s\+\#\.\-]+?)\s+(?:certification|certificate|credential)\s*(?:[-–]|from|issued)?\s*(\d{4})?/gi
  ];
  
  for (const pattern of certPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const cert = match[1].trim();
      if (cert.length > 3 && cert.length < 100 && !certifications.includes(cert)) {
        certifications.push(cert);
      }
    }
  }
  
  return certifications.slice(0, 15);
}

/**
 * Generate AI-powered summary using HuggingFace or OpenAI
 */
async function generateSummary(resumeText, apiKey = null) {
  try {
    // Use HuggingFace Inference if available
    if (process.env.HUGGINGFACE_API_KEY) {
      return await summarizeWithHuggingFace(resumeText, process.env.HUGGINGFACE_API_KEY);
    }
    
    // Fallback to OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      return await summarizeWithOpenAI(resumeText, process.env.OPENAI_API_KEY);
    }
    
    // Fallback to local summarization
    return generateLocalSummary(resumeText);
  } catch (error) {
    console.error('Summary generation error:', error);
    return generateLocalSummary(resumeText);
  }
}

/**
 * Summarize using HuggingFace API
 */
async function summarizeWithHuggingFace(text, apiKey) {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
      {
        inputs: text.substring(0, 1024) // Limit text for API
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data && response.data[0] && response.data[0].summary_text) {
      return response.data[0].summary_text;
    }
    return generateLocalSummary(text);
  } catch (error) {
    console.error('HuggingFace summarization error:', error);
    return generateLocalSummary(text);
  }
}

/**
 * Summarize using OpenAI API
 */
async function summarizeWithOpenAI(text, apiKey) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Create a 2-3 sentence professional summary of this resume. Focus on key strengths and experience.'
          },
          {
            role: 'user',
            content: text.substring(0, 2000)
          }
        ],
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      return response.data.choices[0].message.content.trim();
    }
    return generateLocalSummary(text);
  } catch (error) {
    console.error('OpenAI summarization error:', error);
    return generateLocalSummary(text);
  }
}

/**
 * Generate local summary without API calls
 */
function generateLocalSummary(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  let summary = '';
  let charCount = 0;
  const maxChars = 500;
  
  for (const sentence of sentences) {
    if (charCount + sentence.length <= maxChars) {
      summary += sentence.trim() + ' ';
      charCount += sentence.length;
    } else {
      break;
    }
  }
  
  return summary.trim() || text.substring(0, maxChars);
}

/**
 * Validate and enrich extracted data
 */
function validateAndEnrichData(extractedData) {
  // Remove duplicates from skills
  if (extractedData.skills) {
    extractedData.skills = [...new Set(extractedData.skills)];
  }
  
  // Add soft skills if not already present
  if (!extractedData.softSkills || extractedData.softSkills.length === 0) {
    const fullText = JSON.stringify(extractedData).toLowerCase();
    extractedData.softSkills = extractSoftSkills(fullText);
  }
  
  // Add technical skills if not already present
  if (!extractedData.technicalSkills || extractedData.technicalSkills.length === 0) {
    const fullText = JSON.stringify(extractedData).toLowerCase();
    extractedData.technicalSkills = extractTechnicalSkills(fullText);
  }
  
  // Add achievements if not already present
  if (!extractedData.achievements || extractedData.achievements.length === 0) {
    const fullText = JSON.stringify(extractedData);
    extractedData.achievements = extractAchievements(fullText);
  }
  
  return extractedData;
}

/**
 * Improve text extraction from PDF with better detail capture
 */
function improveTextExtraction(rawText) {
  // Normalize whitespace
  let improved = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/\s{2,}/g, ' ')
    .split('\n')
    .filter(line => line.trim())
    .join('\n');
  
  return improved;
}

module.exports = {
  extractSoftSkills,
  extractTechnicalSkills,
  extractAchievements,
  extractDetailedCertifications,
  generateSummary,
  validateAndEnrichData,
  improveTextExtraction,
  SOFT_SKILLS
};
