const axios = require('axios');
const { invokeGemini, invokeGeminiText } = require('../services/geminiService');
const {
  extractSEOKeywords,
  incorporateSEOKeywords,
  generateSEOOptimizedSummary,
  generateSEOOptimizedExperience,
  generateSEOKeywordTips,
  analyzeKeywordMatch,
  generateSEOOptimizedResume
} = require('./seoKeywordExtractor');

/**
 AI Model Call Helper - uses Gemini Text
 */
const callAIModel = async (prompt) => {
  try {
    return await invokeGeminiText(prompt);
  } catch (error) {
    console.error('AI Model call failed:', error);
    return null;
  }
};

/**
 * AI Resume Enhancement using Hugging Face Inference
 */

// Initialize Hugging Face API - you can add your API key in .env
const HF_API_KEY = process.env.HUGGING_FACE_API_KEY || '';
const HF_API_BASE = 'https://api-inference.huggingface.co/models';

// Initialize Gemini API - Primary AI for resume features
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Generate improved resume summary with AI
 */
const generateImprovedSummary = async (personalInfo, experience) => {
  try {
    const experienceText = experience
      .map(exp => `${exp.position} at ${exp.company} (${exp.duration})`)
      .join('. ');

    const prompt = `Create a compelling professional summary for a resume:
Name: ${personalInfo.fullName}
Current Title: ${personalInfo.title || 'Professional'}
Experience: ${experienceText || 'Not specified'}

Write a concise (2-3 sentences), impactful professional summary that highlights key strengths and career objectives. Be specific and results-oriented.`;

    const summary = await callAIModel(prompt);
    return summary || personalInfo.summary;
  } catch (error) {
    console.error('Summary generation error:', error);
    return personalInfo.summary;
  }
};

/**
 * Generate improvement suggestions for resume
 */
const generateImprovementSuggestions = async (resumeData) => {
  try {
    const analysis = {
      strengths: [],
      improvements: [],
      score: 0,
      details: {}
    };

    // Check completeness
    const completenessChecks = [
      { field: 'fullName', label: 'Full Name', weight: 10 },
      { field: 'email', label: 'Email', weight: 10 },
      { field: 'phone', label: 'Phone', weight: 10 },
      { field: 'summary', label: 'Professional Summary', weight: 15 },
      { field: 'experience', label: 'Work Experience', weight: 20 },
      { field: 'education', label: 'Education', weight: 15 },
      { field: 'skills', label: 'Skills', weight: 10 },
    ];

    let completenessScore = 0;

    for (const check of completenessChecks) {
      let hasContent = false;

      if (check.field === 'experience') {
        hasContent = resumeData.experience?.length > 0;
      } else if (check.field === 'education') {
        hasContent = resumeData.education?.length > 0;
      } else if (check.field === 'skills') {
        hasContent = resumeData.skills?.length > 0;
      } else {
        hasContent = resumeData.personalInfo?.[check.field]?.length > 0;
      }

      if (hasContent) {
        completenessScore += check.weight;
        analysis.strengths.push(`✓ ${check.label} is complete`);
      } else {
        analysis.improvements.push({
          type: check.field,
          title: `Add ${check.label}`,
          description: `Your resume is missing ${check.label.toLowerCase()}. This is important for recruiters.`,
          priority: 'high'
        });
      }
    }

    // Content quality checks
    const summaryLength = resumeData.personalInfo?.summary?.length || 0;
    if (summaryLength > 50) {
      analysis.strengths.push('✓ Professional summary is detailed');
    } else if (summaryLength > 0) {
      analysis.improvements.push({
        type: 'summary_length',
        title: 'Expand Professional Summary',
        description: 'Your summary should be 2-3 sentences. Make it more impactful by highlighting key achievements.',
        priority: 'medium'
      });
    }

    // Experience quality
    if (resumeData.experience?.length > 0) {
      const avgDescLength = resumeData.experience.reduce((sum, exp) =>
        sum + (exp.description?.length || 0), 0) / resumeData.experience.length;

      if (avgDescLength > 50) {
        analysis.strengths.push('✓ Experience descriptions are detailed');
      } else {
        analysis.improvements.push({
          type: 'experience_detail',
          title: 'Enhance Experience Descriptions',
          description: 'Add more details to your experience entries. Use action verbs and include metrics/achievements.',
          priority: 'high'
        });
      }
    }

    // Skills quality
    if (resumeData.skills?.length >= 10) {
      analysis.strengths.push('✓ Good number of skills listed');
    } else if (resumeData.skills?.length > 0) {
      analysis.improvements.push({
        type: 'skills_count',
        title: 'Add More Skills',
        description: 'List 10-15 relevant skills. Include both technical and soft skills.',
        priority: 'medium'
      });
    }

    // ATS Optimization
    const hasLinkedIn = resumeData.personalInfo?.linkedin?.length > 0;
    const hasPortfolio = resumeData.personalInfo?.portfolio?.length > 0;

    if (!hasLinkedIn) {
      analysis.improvements.push({
        type: 'linkedin',
        title: 'Add LinkedIn Profile',
        description: 'Include your LinkedIn URL for better professional visibility.',
        priority: 'low'
      });
    }

    if (!hasPortfolio && resumeData.skills?.some(s =>
      ['design', 'developer', 'programmer', 'engineer'].some(keyword => s.toLowerCase().includes(keyword))
    )) {
      analysis.improvements.push({
        type: 'portfolio',
        title: 'Add Portfolio Link',
        description: 'Include a portfolio or GitHub link to showcase your work.',
        priority: 'medium'
      });
    }

    // Calculate final score
    analysis.score = Math.round(completenessScore);

    if (resumeData.skills?.length >= 10) analysis.score += 10;
    if (summaryLength > 50) analysis.score += 10;
    if (resumeData.experience?.length >= 2) analysis.score += 10;
    if (resumeData.education?.length > 0) analysis.score += 5;
    if (resumeData.certifications?.length > 0) analysis.score += 5;

    analysis.score = Math.min(analysis.score, 100);

    return analysis;
  } catch (error) {
    console.error('Error generating suggestions:', error);
    throw error;
  }
};

/**
 * Improve specific content with AI
 */
const improveContent = async (section, content) => {
  try {
    let prompt = '';

    switch (section) {
      case 'summary':
        prompt = `Rewrite this professional summary to be more impactful and results-focused. Keep it 2-3 sentences max:
"${content}"

Provide only the improved summary.`;
        break;

      case 'experience':
        prompt = `Improve this job description to be more impactful using action verbs and quantifiable results:
"${content}"

Make it professional and ATS-friendly. Provide only the improved text.`;
        break;

      case 'skill':
        prompt = `Expand on this skill description to be more specific and relevant:
"${content}"

Provide only the improved text.`;
        break;

      case 'achievement':
        prompt = `Rewrite this achievement to highlight impact and quantifiable results:
"${content}"

Use action verbs and include metrics if possible. Provide only the improved text.`;
        break;

      default:
        prompt = `Improve this resume text to be more professional and impactful:
"${content}"

Provide only the improved text.`;
    }

    const improved = await callAIModel(prompt);
    return improved || content;
  } catch (error) {
    console.error('Content improvement error:', error);
    return content;
  }
};

/**
 * Get personalized resume tips based on job title
 */
const getPersonalizedTips = async (jobTitle, skills) => {
  try {
    const prompt = `Provide 5 specific resume tips for someone applying for a ${jobTitle} position with these skills: ${skills.join(', ')}.

Format as a JSON array with objects containing 'tip' and 'explanation' fields.`;

    const tips = await callAIModel(prompt);

    try {
      return JSON.parse(tips);
    } catch {
      // If JSON parsing fails, return default tips
      return [
        { tip: 'Highlight relevant projects', explanation: 'Showcase work directly related to the role' },
        { tip: 'Use industry keywords', explanation: 'Include terms from the job description' },
        { tip: 'Quantify achievements', explanation: 'Use numbers to demonstrate impact' },
        { tip: 'Match skills to role', explanation: 'Prioritize skills matching the job requirements' }
      ];
    }
  } catch (error) {
    console.error('Tips generation error:', error);
    return [
      { tip: 'Customize for each role', explanation: 'Tailor your resume to the job description' },
      { tip: 'Use action verbs', explanation: 'Start bullet points with strong verbs like "Led", "Developed", "Managed"' }
    ];
  }
};



/**
 * Check resume quality and provide score
 */
const checkResumeQuality = async (resumeData) => {
  try {
    const quality = {
      overallScore: 0,
      categories: {
        completeness: 0,
        content: 0,
        formatting: 0,
        ats: 0
      },
      feedback: [],
      recommendations: []
    };

    // Completeness score
    const requiredFields = [
      resumeData.personalInfo?.fullName,
      resumeData.personalInfo?.email,
      resumeData.personalInfo?.phone,
      resumeData.experience?.length > 0,
      resumeData.education?.length > 0,
      resumeData.skills?.length > 0
    ].filter(Boolean).length;

    quality.categories.completeness = Math.round((requiredFields / 6) * 100);

    // Content quality
    const contentQuality = [
      (resumeData.personalInfo?.summary?.length || 0) > 50 ? 20 : 0,
      (resumeData.experience?.length || 0) >= 2 ? 20 : 10,
      (resumeData.skills?.length || 0) >= 10 ? 20 : 10,
      (resumeData.education?.length || 0) > 0 ? 20 : 10,
      (resumeData.certifications?.length || 0) > 0 ? 20 : 0
    ].reduce((a, b) => a + b, 0) / 5;

    quality.categories.content = Math.round(contentQuality);

    // Formatting quality
    const formatQuality = [
      resumeData.personalInfo?.linkedin ? 25 : 0,
      resumeData.personalInfo?.portfolio ? 25 : 0,
      resumeData.personalInfo?.title ? 25 : 0,
      resumeData.projects?.length > 0 ? 25 : 0
    ].reduce((a, b) => a + b, 0) / 4;

    quality.categories.formatting = Math.round(formatQuality);

    // ATS Optimization
    const hasNoSpecialChars = !resumeData.personalInfo?.summary?.match(/[^a-zA-Z0-9\s.,\-()&]/);
    const hasRelevantKeywords = (resumeData.skills?.length || 0) > 5;
    const simpleFormat = resumeData.experience?.every(exp => exp.company && exp.position);

    quality.categories.ats = Math.round(
      ((hasNoSpecialChars ? 33 : 0) + (hasRelevantKeywords ? 33 : 0) + (simpleFormat ? 34 : 0)) / 3
    );

    // Calculate overall
    quality.overallScore = Math.round(
      quality.categories.completeness * 0.3 +
      quality.categories.content * 0.35 +
      quality.categories.formatting * 0.15 +
      quality.categories.ats * 0.2
    );

    // Generate feedback
    if (quality.categories.completeness < 80) {
      quality.feedback.push('Complete all required sections for a stronger resume');
    }
    if (quality.categories.content < 70) {
      quality.feedback.push('Add more detailed descriptions to your experience and achievements');
    }
    if (quality.categories.ats < 60) {
      quality.feedback.push('Optimize your resume for Applicant Tracking Systems (avoid special formatting)');
    }

    return quality;
  } catch (error) {
    console.error('Quality check error:', error);
    throw error;
  }
};

/**
 * Generate complete resume from job description with SEO keywords
 */
const generateResumeFromJob = async (jobDescription, userInfo = {}) => {
  const seoKeywords = extractSEOKeywords(jobDescription);

  const prompt = `
    You are a world-class resume writer, and your task is to create a complete, professional, and ATS-optimized resume based on the provided job description and user information. The output must be a single, minified JSON object.

    ### JOB DESCRIPTION:
    ${jobDescription}

    ### USER INFORMATION:
    ${JSON.stringify(userInfo, null, 2)}

    ### INSTRUCTIONS:
    1.  **Professional Summary**: Write a compelling 2-4 sentence summary that is highly optimized for Google SEO and ATS. Naturally incorporate the provided keywords. High impact, results-oriented language.
    2.  **Skills**: Extract and list 12-18 relevant technical and soft skills from the job description. Prioritize high-volume SEO keywords found in the description.
    3.  **Work Experience**: Generate 3 relevant work experience entries with 4-5 impactful, quantifiable bullet points each. Use action verbs and naturally integrate technical keywords. Focus on achievements that include metrics (%, $, numbers) for best accuracy and impact.
    4.  **Education & Projects**: Create realistic and high-quality entries for education and at least 2 relevant projects that showcase the skills mentioned in the job description.
    5.  **SEO Strategy**: The entire resume should be built with a "Keyword Density" of 10-15% for the primary skills, ensuring it ranks high for both human recruiters and automated ATS/Search engines.
    6.  **Accuracy**: Ensure all generated content is professionally worded and contextually accurate to the role.

    ### SEO KEYWORDS TO PRIORITIZE:
    -   **Primary Technical**: ${seoKeywords.technicalSkills.slice(0, 8).join(', ')}
    -   **Essential Soft Skills**: ${seoKeywords.softSkills.slice(0, 5).join(', ')}
    -   **Methodologies**: ${seoKeywords.methodologies.slice(0, 5).join(', ')}

    ### JSON OUTPUT (MUST be a single, minified line):
    {"personalInfo":{"fullName":"${userInfo.fullName || 'Your Name'}","email":"${userInfo.email || 'your.email@example.com'}","phone":"","location":"","summary":""},"experience":[{"position":"","company":"","duration":"","description":""}],"education":[{"degree":"","institution":""}],"skills":[],"projects":[]}
  `;

  try {
    const generatedResume = await invokeGemini(prompt);
    return generatedResume;
  } catch (error) {
    console.error('AI resume generation failed:', error);
    throw new Error('Failed to generate AI-powered resume. Please try again.');
  }
};

/**
 * Generate section-specific content suggestions
 */
const generateSectionSuggestions = async (sectionType, context = {}) => {
  try {
    let prompt = '';

    switch (sectionType) {
      case 'summary':
        prompt = `Generate 3 professional summary options for a ${context.jobTitle || 'professional'} with ${context.experience || 'experience'}:
1. Achievement-focused summary
2. Skills-focused summary
3. Career-objective focused summary

Each should be 2-3 sentences and compelling.`;
        break;

      case 'experience':
        prompt = `Generate 3 bullet point descriptions for a ${context.position} role at ${context.company}:
- Focus on achievements and impact
- Use quantifiable results
- Start with strong action verbs
- Keep each bullet 1-2 lines`;
        break;

      case 'skills':
        prompt = `Suggest 8-12 key skills for a ${context.jobTitle || 'professional'} role in ${context.industry || 'technology'}:
- Include technical skills
- Include soft skills
- Prioritize most relevant skills
- Format as array`;
        break;

      case 'projects':
        prompt = `Generate 2-3 project descriptions for a ${context.jobTitle || 'developer'}:
Each project should include:
- Project name
- Technologies used
- Key features
- Results/impact
- Format as structured objects`;
        break;

      default:
        prompt = `Generate helpful content suggestions for the ${sectionType} section of a resume.`;
    }

    const suggestions = await callAIModel(prompt);
    return parseSuggestionsResponse(suggestions, sectionType);
  } catch (error) {
    console.error('Section suggestions error:', error);
    throw error;
  }
};

/**
 * Optimize resume for specific job with SEO keyword analysis
 */
const optimizeResumeForJob = async (resumeData, jobDescription) => {
  try {
    // Extract SEO keywords from job description
    const seoKeywords = extractSEOKeywords(jobDescription);

    // Analyze keyword match
    const resumeText = JSON.stringify(resumeData);
    const keywordMatch = analyzeKeywordMatch(resumeText, jobDescription);

    const prompt = `Analyze this resume and job description, then provide SEO-optimized suggestions:

RESUME:
${JSON.stringify(resumeData, null, 2)}

JOB DESCRIPTION:
${jobDescription}

KEY KEYWORDS TO INCLUDE:
Technical: ${seoKeywords.technicalSkills.slice(0, 5).join(', ')}
Soft Skills: ${seoKeywords.softSkills.slice(0, 3).join(', ')}
Methodologies: ${seoKeywords.methodologies.slice(0, 3).join(', ')}

Current Match: ${keywordMatch.matchPercentage}% keywords matched

Provide specific recommendations to:
1. Add missing keywords from job (especially: ${keywordMatch.missingKeywords.technical.slice(0, 2).join(', ')})
2. Naturally incorporate relevant keywords for ATS optimization
3. Reorder sections for better relevance
4. Strengthen weak sections with keyword-rich content
5. Add quantifiable achievements
6. Improve ATS compatibility
7. Optimize for keyword density (10-15%)

Format as JSON with changes, explanations, and keyword suggestions.`;

    const optimizations = await callAIModel(prompt);
    const parsedOptimizations = parseOptimizationResponse(optimizations);

    // Add SEO analysis metadata
    parsedOptimizations.seoAnalysis = {
      keywordMatch: keywordMatch,
      extractedKeywords: seoKeywords,
      tips: generateSEOKeywordTips(jobDescription, seoKeywords),
      recommendations: {
        missingKeywords: keywordMatch.missingKeywords,
        matchPercentage: keywordMatch.matchPercentage,
        improvementPotential: 100 - keywordMatch.matchPercentage
      }
    };

    return parsedOptimizations;
  } catch (error) {
    console.error('Resume optimization error:', error);
    throw error;
  }
};

/**
 * Generate experience description with AI
 */
const generateExperienceDescription = async (position, company, achievements = []) => {
  try {
    const achievementsText = achievements.length > 0
      ? achievements.join('\n- ')
      : 'Led projects, improved processes, achieved results';

    const prompt = `Create a compelling work experience description for:

Position: ${position}
Company: ${company}
Key Achievements: ${achievementsText}

Generate 4-6 bullet points that:
- Start with strong action verbs
- Include quantifiable results
- Show impact and leadership
- Are ATS-friendly
- Are concise but detailed`;

    const description = await callAIModel(prompt);
    return parseExperienceResponse(description);
  } catch (error) {
    console.error('Experience generation error:', error);
    throw error;
  }
};

/**
 * Recommend skills based on job title
 */
const recommendSkills = async (jobTitle, currentSkills = []) => {
  try {
    const currentSkillsText = currentSkills.length > 0
      ? `Current skills: ${currentSkills.join(', ')}`
      : 'No current skills specified';

    const prompt = `Recommend skills for a ${jobTitle} position:

${currentSkillsText}

Suggest:
- 5-8 technical skills
- 3-5 soft skills
- 2-3 industry-specific skills
- Prioritize skills not already listed
- Focus on in-demand skills for this role

Format as JSON: { "technical": [...], "soft": [...], "industry": [...] }`;

    const recommendations = await callAIModel(prompt);
    return parseSkillsResponse(recommendations);
  } catch (error) {
    console.error('Skills recommendation error:', error);
    throw error;
  }
};

/**
 * Parse AI response for resume generation
 */
function parseAIResumeResponse(aiResponse) {
  try {
    // Try to extract JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: create basic structure
    return {
      personalInfo: {
        fullName: 'Your Name',
        email: 'your.email@example.com',
        summary: aiResponse.substring(0, 300)
      },
      experience: [],
      education: [],
      skills: [],
      projects: []
    };
  } catch (error) {
    console.error('Error parsing AI resume response:', error);
    return createFallbackResume();
  }
}

/**
 * Parse suggestions response
 */
function parseSuggestionsResponse(response, sectionType) {
  try {
    // Split by numbers or bullets
    const suggestions = response.split(/\d+\.|\n-|\n•/).filter(s => s.trim().length > 10);
    return suggestions.map(s => s.trim());
  } catch (error) {
    return [response];
  }
}

/**
 * Parse optimization response
 */
function parseOptimizationResponse(response) {
  return {
    suggestions: response.split('\n').filter(line => line.trim().length > 0),
    priority: 'high'
  };
}

/**
 * Parse experience response
 */
function parseExperienceResponse(response) {
  return response.split('\n').filter(line => line.trim().length > 0);
}

/**
 * Parse skills response
 */
function parseSkillsResponse(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { technical: [], soft: [], industry: [] };
  } catch (error) {
    return { technical: [], soft: [], industry: [] };
  }
}

/**
 * Create fallback resume structure
 */
function createFallbackResume() {
  return {
    personalInfo: {
      fullName: '',
      email: '',
      summary: 'Professional with experience in various roles.'
    },
    experience: [],
    education: [],
    skills: ['Communication', 'Problem Solving', 'Teamwork'],
    projects: []
  };
}

/**
 * Extract and analyze SEO keywords from job description
 */
const extractSEOKeywordsFromJob = async (jobDescription) => {
  try {
    const keywords = extractSEOKeywords(jobDescription);
    const tips = generateSEOKeywordTips(jobDescription, keywords);

    return {
      success: true,
      keywords,
      tips,
      analysis: {
        totalKeywords: keywords.count,
        technicalSkillsCount: keywords.technicalSkills.length,
        softSkillsCount: keywords.softSkills.length,
        methodologiesCount: keywords.methodologies.length,
        yearsRequired: keywords.yearsRequired
      }
    };
  } catch (error) {
    console.error('Error extracting SEO keywords:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Analyze Google SEO keyword match between resume and job description
 */
const analyzeSEOKeywordMatch = async (resumeData, jobDescription) => {
  try {
    const resumeText = JSON.stringify(resumeData);
    const match = analyzeKeywordMatch(resumeText, jobDescription);
    const keywords = extractSEOKeywords(jobDescription);

    return {
      success: true,
      match,
      keywords,
      recommendations: {
        addSkills: match.missingKeywords.technical.slice(0, 5),
        emphasizeSkills: match.matchedKeywords.technical.slice(0, 5),
        addSoftSkills: match.missingKeywords.soft.slice(0, 3),
        improvementAreas: `Focus on adding: ${match.missingKeywords.technical.slice(0, 3).join(', ')}`,
        overallGrade: match.matchPercentage >= 80 ? 'A' : match.matchPercentage >= 60 ? 'B' : match.matchPercentage >= 40 ? 'C' : 'D'
      }
    };
  } catch (error) {
    console.error('Error analyzing keyword match:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate multiple AI-powered suggestions for a specific resume section.
 */
const generateMultipleSuggestions = async (sectionType, currentContent, context = {}) => {
  const prompt = `
    You are an expert resume writing assistant. Your task is to generate three distinct, high-quality suggestions for a resume section.

    ### SECTION:
    ${sectionType}

    ### CURRENT CONTENT:
    "${currentContent}"

    ### CONTEXT (Job Title, etc.):
    ${JSON.stringify(context, null, 2)}

    ### INSTRUCTIONS:
    1.  **Analyze**: Understand the user's current content and the context.
    2.  **Generate 3 Alternatives**: Create three unique and improved versions of the content.
        -   **Suggestion 1 (Conservative)**: A slightly polished and improved version of the original.
        -   **Suggestion 2 (Bold & Impactful)**: A more dynamic and achievement-oriented version.
        -   **Suggestion 3 (Creative & Unique)**: A version that takes a unique angle or tone.
    3.  **Output**: Return a minified JSON object with a single key, "suggestions", which is an array of three strings.

    ### JSON OUTPUT (MUST be a single, minified line):
    {"suggestions":["Suggestion 1 text...","Suggestion 2 text...","Suggestion 3 text..."]}
  `;

  try {
    const result = await invokeGemini(prompt);
    if (!result.suggestions || result.suggestions.length < 3) {
      throw new Error('AI did not return enough suggestions.');
    }
    return result.suggestions;
  } catch (error) {
    console.error(`Failed to generate AI suggestions for ${sectionType}:`, error);
    throw new Error(`The AI failed to generate suggestions for your ${sectionType}. Please try again.`);
  }
};

module.exports = {
  generateImprovedSummary,
  generateImprovementSuggestions,
  improveContent,
  getPersonalizedTips,
  checkResumeQuality,
  generateResumeFromJob,
  generateSectionSuggestions,
  optimizeResumeForJob,
  generateExperienceDescription,
  recommendSkills,
  extractSEOKeywordsFromJob,
  analyzeSEOKeywordMatch,
  generateMultipleSuggestions
};
