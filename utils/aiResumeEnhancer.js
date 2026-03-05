const axios = require('axios');
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
 * AI Resume Enhancement using Hugging Face Inference
 */

// Initialize Hugging Face API - you can add your API key in .env
const HF_API_KEY = process.env.HUGGING_FACE_API_KEY || '';
const HF_API_BASE = 'https://api-inference.huggingface.co/models';

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
 * Call AI model with prompt
 */
const callAIModel = async (prompt) => {
  try {
    // If Hugging Face API key is available, use it
    if (HF_API_KEY) {
      const response = await axios.post(
        `${HF_API_BASE}/gpt2`,
        { inputs: prompt },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
          },
          timeout: 10000,
        }
      );

      if (response.data && response.data[0]) {
        return response.data[0].generated_text;
      }
    }

    // Fallback: Return enhanced version using basic NLP
    return enhanceTextBasic(prompt);
  } catch (error) {
    console.error('AI model error:', error);
    return enhanceTextBasic(prompt);
  }
};

/**
 * Basic text enhancement without external API
 */
const enhanceTextBasic = (text) => {
  // Remove quotes from prompt
  const originalText = text.match(/"([^"]*)"/)?.[1] || text;

  // Add action verbs for job descriptions
  const actionVerbs = [
    'Spearheaded',
    'Orchestrated',
    'Engineered',
    'Architected',
    'Optimized',
    'Accelerated',
    'Transformed',
    'Maximized',
    'Streamlined',
    'Expanded'
  ];

  let enhanced = originalText;

  // If it looks like a job description, start with action verb
  if (!originalText.toLowerCase().match(/^(led|managed|developed|created|built)/i)) {
    const verb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
    enhanced = `${verb} ${enhanced}`;
  }

  // Add impact words
  const impactWords = ['significant', 'measurable', 'substantial', 'remarkable', 'outstanding'];
  if (!enhanced.toLowerCase().match(/improved|increased|reduced|enhanced/i)) {
    enhanced += ' with significant impact on team efficiency';
  }

  return enhanced;
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
      (quality.categories.completeness * 0.3 +
       quality.categories.content * 0.35 +
       quality.categories.formatting * 0.15 +
       quality.categories.ats * 0.2) / 100
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
  try {
    // Extract SEO keywords from job description
    const seoKeywords = extractSEOKeywords(jobDescription);
    
    const prompt = `Create a complete resume structure based on this job description:

JOB DESCRIPTION:
${jobDescription}

USER INFO:
${JSON.stringify(userInfo, null, 2)}

IMPORTANT - Include these relevant keywords naturally in the resume:
Technical Skills: ${seoKeywords.technicalSkills.slice(0, 5).join(', ')}
Soft Skills: ${seoKeywords.softSkills.slice(0, 3).join(', ')}
Methodologies: ${seoKeywords.methodologies.slice(0, 3).join(', ')}

Generate a comprehensive, SEO-optimized resume with:
1. Professional Summary (2-3 sentences, incorporating key technical skills)
2. Key Skills (8-12 relevant skills, prioritizing the keywords above)
3. Work Experience (2-3 positions with descriptions using relevant keywords)
4. Education (relevant degrees)
5. Projects (2-3 relevant projects with keyword optimization)

Format as JSON with this structure:
{
  "personalInfo": {
    "fullName": "${userInfo.fullName || 'Your Name'}",
    "email": "${userInfo.email || 'your.email@example.com'}",
    "phone": "${userInfo.phone || '(555) 123-4567'}",
    "location": "${userInfo.location || 'City, State'}",
    "summary": "Generated summary incorporating key keywords here"
  },
  "experience": [...],
  "education": [...],
  "skills": [...],
  "projects": [...]
}`;

    const aiResponse = await callAIModel(prompt);
    let generatedResume = parseAIResumeResponse(aiResponse);

    // Apply SEO optimization to the generated resume
    if (generatedResume) {
      const seoOptimized = generateSEOOptimizedResume(generatedResume, jobDescription);
      generatedResume = seoOptimized.optimizedResume || generatedResume;
      
      // Add SEO metadata
      generatedResume.seoMetadata = {
        extractedKeywords: seoKeywords,
        optimized: true,
        jobDescription: jobDescription.substring(0, 200) // Store first 200 chars for reference
      };
    }

    return generatedResume;
  } catch (error) {
    console.error('Resume generation from job error:', error);
    throw error;
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

module.exports = {
  generateImprovedSummary,
  generateImprovementSuggestions,
  improveContent,
  getPersonalizedTips,
  checkResumeQuality,
  callAIModel,
  generateResumeFromJob,
  generateSectionSuggestions,
  optimizeResumeForJob,
  generateExperienceDescription,
  recommendSkills,
  extractSEOKeywordsFromJob,
  analyzeSEOKeywordMatch
};
