const expressAsyncHandler = require('express-async-handler');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const { 
  extractSoftSkills, 
  extractTechnicalSkills,
  extractAchievements,
  extractDetailedCertifications,
  generateSummary,
  validateAndEnrichData,
  improveTextExtraction 
} = require('../utils/extractionEnhancer');
const {
  generateImprovedSummary,
  generateImprovementSuggestions,
  improveContent,
  getPersonalizedTips,
  checkResumeQuality
} = require('../utils/aiResumeEnhancer');

/**
 * Send error response
 */
function sendError(res, status = 400, message = 'Bad Request', details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

/**
 * Send success response
 */
function sendSuccess(res, data, message = 'Success') {
  return res.json({ success: true, message, data });
}

/**
 * Extract text and data from PDF with AI enhancement
 */
const extractPdfData = expressAsyncHandler(async (req, res) => {
  try {
    // Validate file upload
    if (!req.file) {
      console.error('No file in request body');
      return sendError(res, 400, 'No file uploaded. Please select a PDF file.');
    }

    const fileBuffer = req.file.buffer;
    
    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('Empty file buffer received');
      return sendError(res, 400, 'File is empty. Please upload a valid PDF.');
    }

    console.log(`Processing PDF file: ${req.file.originalname} (${fileBuffer.length} bytes)`);

    // Parse PDF with improved text extraction
    let pdfData;
    try {
      pdfData = await pdfParse(fileBuffer);
    } catch (pdfErr) {
      console.error('PDF parsing error:', pdfErr.message);
      return sendError(res, 400, 'Unable to read PDF. Ensure it is a valid PDF file with extractable text (not a scanned image).', pdfErr.message);
    }

    // Validate extracted text
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      console.error('No text extracted from PDF');
      return sendError(res, 400, 'No text found in PDF. Please ensure your resume PDF contains readable text (not just images).');
    }

    // Improve text quality
    let text = improveTextExtraction(pdfData.text);
    console.log(`Extracted text length: ${text.length} characters`);

    // Extract structured data from PDF text
    let extractedData = parseResumeText(text);
    console.log('Basic data extracted', {
      name: extractedData.personalInfo?.fullName,
      email: extractedData.personalInfo?.email,
      experienceCount: extractedData.experience?.length || 0,
      skillCount: extractedData.skills?.length || 0
    });
    
    // Enhance with AI features
    extractedData.softSkills = extractSoftSkills(text);
    extractedData.achievements = extractAchievements(text);
    extractedData.certifications = extractDetailedCertifications(text);
    
    console.log('AI features added', {
      softSkills: extractedData.softSkills?.length || 0,
      achievements: extractedData.achievements?.length || 0,
      certifications: extractedData.certifications?.length || 0
    });
    
    // Enrich and validate data
    extractedData = validateAndEnrichData(extractedData);
    
    // Generate AI summary if not already present
    if (!extractedData.personalInfo?.summary || extractedData.personalInfo.summary.length < 50) {
      try {
        console.log('Generating AI summary...');
        extractedData.personalInfo.summary = await generateSummary(text);
        console.log('Summary generated successfully');
      } catch (err) {
        console.log('Summary generation skipped, using basic extraction', err.message);
      }
    }

    console.log('PDF extraction completed successfully');
    return sendSuccess(res, extractedData, 'PDF extracted successfully with AI enhancement');
  } catch (error) {
    console.error('PDF extraction error:', error);
    return sendError(res, 500, 'Failed to extract PDF. Please try again or enter data manually.', error.message);
  }
});

/**
 * Parse resume text and extract structured data with enhanced detail extraction
 */
function parseResumeText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const textLower = text.toLowerCase();

  const extractedData = {
    personalInfo: {
      fullName: extractName(lines, text),
      email: extractEmail(text),
      phone: extractPhone(text),
      location: extractLocation(lines),
      linkedin: extractLinkedin(text),
      portfolio: extractPortfolio(text),
      title: extractTitle(lines),
      summary: extractSummary(lines, text)
    },
    experience: extractExperienceEnhanced(text, lines),
    education: extractEducationEnhanced(text, lines),
    skills: extractSkillsEnhanced(text, lines),
    technicalSkills: extractTechnicalSkills(text),
    softSkills: [],
    projects: extractProjectsEnhanced(text, lines),
    certifications: extractCertificationsEnhanced(text, lines),
    languages: extractLanguagesEnhanced(text, lines),
    achievements: [],
    aiSummary: null
  };

  return extractedData;
}

/**
 * Extract full name (usually at the top)
 */
function extractName(lines, text) {
  // First non-email, non-phone line is usually the name
  for (const line of lines) {
    if (line.length > 2 && line.length < 50 && 
        !line.includes('@') && 
        !line.match(/\d{3}/) &&
        line.split(' ').length <= 4) {
      return line;
    }
  }
  return '';
}

/**
 * Extract email address
 */
function extractEmail(text) {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const match = text.match(emailRegex);
  return match ? match[1] : '';
}

/**
 * Extract phone number
 */
function extractPhone(text) {
  const phoneRegex = /(\+?1?\s*)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+\d{1,3}\s?\d{5,14})/;
  const match = text.match(phoneRegex);
  return match ? match[0].trim() : '';
}

/**
 * Extract location
 */
function extractLocation(lines) {
  const locationKeywords = ['location:', 'based in', 'city:', 'address:'];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    for (const keyword of locationKeywords) {
      if (line.includes(keyword)) {
        return lines[i].replace(new RegExp(keyword, 'i'), '').trim();
      }
    }
    // Look for city, state pattern
    if (lines[i].match(/^[A-Z][a-z]+,\s*[A-Z]{2}$/)) {
      return lines[i];
    }
  }
  return '';
}

/**
 * Extract LinkedIn profile
 */
function extractLinkedin(text) {
  const linkedinRegex = /(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+/i;
  const match = text.match(linkedinRegex);
  return match ? match[0] : '';
}

/**
 * Extract portfolio/website
 */
function extractPortfolio(text) {
  const portfolioRegex = /(https?:\/\/)?(www\.)?[\w-]+\.(com|net|io|co|dev|me|io)(?!.*linkedin)/i;
  const matches = text.match(portfolioRegex);
  return matches ? matches[0] : '';
}

/**
 * Extract professional title
 */
function extractTitle(lines) {
  const titlePatterns = [
    'professional title:',
    'title:',
    'headline:',
    'position:',
    'job title:'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    for (const pattern of titlePatterns) {
      if (line.includes(pattern)) {
        return lines[i].replace(new RegExp(pattern, 'i'), '').trim();
      }
    }
  }

  // Check if second line looks like a title
  if (lines.length > 1 && lines[1].length < 50) {
    return lines[1];
  }

  return '';
}

/**
 * Extract professional summary
 */
function extractSummary(lines, text) {
  const summaryStart = text.toLowerCase().search(/summary|objective|about/);
  if (summaryStart === -1) return '';

  const summaryText = text.substring(summaryStart);
  const nextSection = summaryText.search(/experience|education|skills|projects/i);

  if (nextSection !== -1) {
    return summaryText.substring(0, nextSection).replace(/summary|objective|about/i, '').trim().substring(0, 500);
  }

  return summaryText.replace(/summary|objective|about/i, '').trim().substring(0, 500);
}

/**
 * Extract work experience - Enhanced version
 */
function extractExperienceEnhanced(text, lines) {
  const experience = [];
  const experienceRegex = /experience|work\s*history|employment|professional\s*history/i;
  const experienceStart = text.toLowerCase().search(experienceRegex);

  if (experienceStart === -1) return experience;

  const experienceSection = text.substring(experienceStart);
  const nextSection = experienceSection.search(/education|skills|projects|certifications|languages|awards|summary/i);
  const experienceText = nextSection !== -1 ? experienceSection.substring(0, nextSection) : experienceSection;

  let currentJob = null;
  const jobLines = experienceText.split('\n').filter(l => l.trim().length > 0);

  for (let i = 0; i < jobLines.length; i++) {
    const line = jobLines[i].trim();
    
    // Look for job titles or new positions
    if (line.match(/[A-Z][a-z\s]*(?:designer|developer|manager|engineer|analyst|specialist|consultant|coordinator|director|lead|architect|officer|executive|associate)[\w\s]*/i)) {
      if (currentJob && (currentJob.company || currentJob.position)) {
        experience.push(currentJob);
      }
      currentJob = {
        position: line,
        company: '',
        duration: '',
        description: '',
        skills: ''
      };
    } else if (currentJob) {
      // Extract company name
      if (!currentJob.company && line.length < 100 && !line.match(/^\d/) && !line.match(/[-•]/)) {
        currentJob.company = line;
      }
      // Extract dates/duration
      else if (line.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\w]*/i)) {
        currentJob.duration = line;
      }
      // Extract bullet points and description
      else if (line.match(/^[-•\*]/)) {
        currentJob.description += (currentJob.description ? ' | ' : '') + line.replace(/^[-•\*]\s*/, '').trim();
      }
    }
  }

  if (currentJob && (currentJob.company || currentJob.position)) {
    experience.push(currentJob);
  }

  return experience.slice(0, 15); // Allow up to 15 entries
}

/**
 * Extract education - Enhanced version
 */
function extractEducationEnhanced(text, lines) {
  const education = [];
  const educationRegex = /education|academic|qualifications?|university|college|school/i;
  const educationStart = text.toLowerCase().search(educationRegex);

  if (educationStart === -1) return education;

  const educationSection = text.substring(educationStart);
  const nextSection = educationSection.search(/experience|skills|projects|certifications|languages|awards/i);
  const educationText = nextSection !== -1 ? educationSection.substring(0, nextSection) : educationSection;

  const degreePatterns = /(?:bachelor|master|phd|diploma|certificate|b\.?s\.?|m\.?s\.?|m\.?b\.?a\.?|b\.?a\.?|m\.?a\.?|b\.?tech|m\.?tech|associate|postgraduate|undergraduate)\s+(?:of\s+)?(?:science|arts|engineering|business|technology|commerce)?/i;
  const eduLines = educationText.split('\n').filter(l => l.trim().length > 0);

  let currentEdu = null;
  for (let i = 0; i < eduLines.length; i++) {
    const line = eduLines[i].trim();
    
    if (line.match(degreePatterns)) {
      if (currentEdu) education.push(currentEdu);
      currentEdu = {
        degree: line.trim(),
        field: '',
        institution: '',
        year: '',
        gpa: '',
        achievements: ''
      };
    } else if (currentEdu) {
      // Extract institution
      if (!currentEdu.institution && line.length > 5 && !line.match(/^\d{4}/)) {
        currentEdu.institution = line.trim();
      }
      // Extract year
      else if (line.match(/\d{4}/)) {
        if (!currentEdu.year) {
          currentEdu.year = line.match(/\d{4}/)[0];
        } else if (line.includes('-') || line.includes('–') || line.includes('/')) {
          currentEdu.year += ' ' + line;
        }
      }
      // Extract GPA
      else if (line.match(/gpa|cgpa/i)) {
        currentEdu.gpa = line;
      }
    }
  }

  if (currentEdu) education.push(currentEdu);

  return education.slice(0, 8);
}

/**
 * Extract skills - Enhanced version with better parsing
 */
function extractSkillsEnhanced(text, lines) {
  const skills = new Set();
  const skillsRegex = /skills|technical\s*skills|competencies|expertise|proficiencies?|languages?\s*&\s*tools|tools?\s*&\s*technologies/i;
  const skillsStart = text.toLowerCase().search(skillsRegex);

  if (skillsStart === -1) return Array.from(skills);

  const skillsSection = text.substring(skillsStart);
  const nextSection = skillsSection.search(/experience|education|projects|certifications|languages|awards/i);
  const skillsText = nextSection !== -1 ? skillsSection.substring(0, nextSection) : skillsSection;

  // Extract bullet-point skills
  const bulletSkills = skillsText.match(/(?:^|\n)\s*[•\-\*]\s*([^\n]+)/gm);
  if (bulletSkills) {
    bulletSkills.forEach(match => {
      const skill = match.replace(/^[\s•\-\*]+/, '').trim();
      if (skill.length > 2 && skill.length < 60) {
        // Split on commas or slashes within the skill
        const subSkills = skill.split(/[,/]/).map(s => s.trim()).filter(s => s.length > 2);
        subSkills.forEach(s => skills.add(s));
      }
    });
  }

  // Also try comma/semicolon separated skills
  if (skills.size < 5) {
    const lineApproach = skillsText.split('\n').filter(l => !l.match(/^[\s•\-\*]/));
    for (const line of lineApproach) {
      if (line.includes(',') || line.includes(';')) {
        const skillList = line.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 60);
        skillList.forEach(s => skills.add(s));
      }
    }
  }

  return Array.from(skills).slice(0, 50);
}

/**
 * Extract projects - Enhanced version
 */
function extractProjectsEnhanced(text, lines) {
  const projects = [];
  const projectsRegex = /projects?|portfolio|work\s*samples?|portfolio\s*projects?/i;
  const projectsStart = text.toLowerCase().search(projectsRegex);

  if (projectsStart === -1) return projects;

  const projectsSection = text.substring(projectsStart);
  const nextSection = projectsSection.search(/certifications|languages|references|awards|additional/i);
  const projectsText = nextSection !== -1 ? projectsSection.substring(0, nextSection) : projectsSection;

  const projectLines = projectsText.split('\n').filter(l => l.trim().length > 0);
  let currentProject = null;

  for (const line of projectLines) {
    // Check for project title (usually bold or followed by colon/dash)
    if (line.match(/^[A-Z][a-z\s]+\s*[-:–]/)) {
      if (currentProject) projects.push(currentProject);
      currentProject = {
        title: line.replace(/[-:–]\s*$/, '').trim(),
        description: '',
        link: '',
        technologies: ''
      };
    } else if (currentProject) {
      // Extract links
      if (line.match(/https?:\/\//)) {
        const link = line.match(/https?:\/\/[^\s]+/)[0];
        currentProject.link = link;
      }
      // Extract description (bullet points)
      else if (line.match(/^[-•\*]/)) {
        currentProject.description += (currentProject.description ? ' | ' : '') + line.replace(/^[-•\*]\s*/, '').trim();
      }
      // Extract technologies
      else if (line.match(/technologies?:|tech:|stack:/i)) {
        currentProject.technologies = line.replace(/technologies?:|tech:|stack:/i, '').trim();
      }
    }
  }

  if (currentProject) projects.push(currentProject);

  return projects.slice(0, 15);
}

/**
 * Extract certifications - Enhanced version
 */
function extractCertificationsEnhanced(text, lines) {
  const certifications = [];
  const certsRegex = /certifications?|licenses?|credentials?|professional\s*development|training/i;
  const certsStart = text.toLowerCase().search(certsRegex);

  if (certsStart === -1) return certifications;

  const certsSection = text.substring(certsStart);
  const nextSection = certsSection.search(/languages|references|additional|awards|skills/i);
  const certsText = nextSection !== -1 ? certsSection.substring(0, nextSection) : certsSection;

  const certMatches = certsText.match(/(?:^|\n)\s*[•\-\*]\s*([^\n]+)/gm);
  if (certMatches) {
    certMatches.forEach(match => {
      const cert = match.replace(/^[\s•\-\*]+/, '').trim();
      if (cert.length > 2 && cert.length < 150) {
        certifications.push(cert);
      }
    });
  }

  return certifications.slice(0, 20);
}

/**
 * Extract languages - Enhanced version
 */
function extractLanguagesEnhanced(text, lines) {
  const languages = [];
  const langsRegex = /languages?|language\s*proficiencies?/i;
  const langsStart = text.toLowerCase().search(langsRegex);

  if (langsStart === -1) return languages;

  const langsSection = text.substring(langsStart);
  const nextSection = langsSection.search(/references|additional|certifications|awards/i);
  const langsText = nextSection !== -1 ? langsSection.substring(0, nextSection) : langsSection;

  // Extract bullet-point languages
  const langMatches = langsText.match(/(?:^|\n)\s*[•\-\*]\s*([A-Za-z\s]+)(?:\s*[-–]\s*[A-Za-z\s]+)?/gm);
  if (langMatches) {
    langMatches.forEach(match => {
      const lang = match.replace(/^[\s•\-\*]+/, '').trim().split(/[-–]/)[0].trim();
      if (lang.length > 2 && lang.length < 50) {
        languages.push(lang);
      }
    });
  }

  // Also handle comma-separated languages
  if (languages.length < 2) {
    const commaSeparated = langsText.split('\n').find(l => l.includes(','));
    if (commaSeparated) {
      commaSeparated.split(',').forEach(lang => {
        const cleaned = lang.replace(/^[\s•\-\*]+/, '').trim();
        if (cleaned.length > 2 && cleaned.length < 50) {
          languages.push(cleaned);
        }
      });
    }
  }

  return languages.slice(0, 15);
}

/**
 * Generate resume with ATS optimization
 */
const generateResume = expressAsyncHandler(async (req, res) => {
  try {
    const { data, template } = req.body;

    if (!data) {
      return sendError(res, 400, 'Resume data is required');
    }

    // Format resume data for ATS if template is atsOptimized
    const formattedData = template === 'atsOptimized' 
      ? formatForATS(data) 
      : data;

    return sendSuccess(res, formattedData, 'Resume generated successfully');
  } catch (error) {
    console.error('Resume generation error:', error);
    return sendError(res, 500, 'Failed to generate resume', error.message);
  }
});

/**
 * Format resume for ATS compatibility
 */
function formatForATS(data) {
  return {
    ...data,
    personalInfo: {
      ...data.personalInfo,
      summary: removeSpecialCharacters(data.personalInfo?.summary || '')
    },
    experience: data.experience?.map(exp => ({
      ...exp,
      description: removeSpecialCharacters(exp.description || '')
    })) || [],
    skills: data.skills?.filter(s => s.length > 2) || []
  };
}

/**
 * Remove special characters from text
 */
function removeSpecialCharacters(text) {
  return text.replace(/[^\w\s.,-]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Download resume as PDF (mock implementation)
 */
const downloadResumePDF = expressAsyncHandler(async (req, res) => {
  try {
    const { data, template, fileName } = req.body;

    if (!data) {
      return sendError(res, 400, 'Resume data is required');
    }

    // For now, return success - actual PDF generation would use a library like pdfkit or puppeteer
    return sendSuccess(res, { 
      url: '/resume-placeholder.pdf',
      fileName: `${fileName || 'resume'}.pdf`
    }, 'PDF download link generated');
  } catch (error) {
    console.error('PDF download error:', error);
    return sendError(res, 500, 'Failed to generate PDF', error.message);
  }
});

/**
 * Save resume draft
 */
const saveDraft = expressAsyncHandler(async (req, res) => {
  try {
    const { userId, data, name } = req.body;

    if (!userId || !data) {
      return sendError(res, 400, 'User ID and resume data are required');
    }

    // In a real implementation, save to database
    // For now, return success
    return sendSuccess(res, { 
      id: Date.now(),
      userId,
      name,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    }, 'Draft saved successfully');
  } catch (error) {
    console.error('Save draft error:', error);
    return sendError(res, 500, 'Failed to save draft', error.message);
  }
});

/**
 * Get resume drafts
 */
const getDrafts = expressAsyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendError(res, 400, 'User ID is required');
    }

    // In a real implementation, fetch from database
    // For now, return empty array
    return sendSuccess(res, [], 'Drafts retrieved successfully');
  } catch (error) {
    console.error('Get drafts error:', error);
    return sendError(res, 500, 'Failed to fetch drafts', error.message);
  }
});

/**
 * Delete resume draft
 */
const deleteDraft = expressAsyncHandler(async (req, res) => {
  try {
    const { draftId } = req.params;

    if (!draftId) {
      return sendError(res, 400, 'Draft ID is required');
    }

    // In a real implementation, delete from database
    return sendSuccess(res, { deleted: true }, 'Draft deleted successfully');
  } catch (error) {
    console.error('Delete draft error:', error);
    return sendError(res, 500, 'Failed to delete draft', error.message);
  }
});

/**
 * Analyze resume against job description
 */
const analyzeResumeMatch = expressAsyncHandler(async (req, res) => {
  try {
    const { data, jobDescription } = req.body;

    if (!data || !jobDescription) {
      return sendError(res, 400, 'Resume data and job description are required');
    }

    const analysis = analyzeMatch(data, jobDescription);

    return sendSuccess(res, analysis, 'Resume analysis completed');
  } catch (error) {
    console.error('Resume analysis error:', error);
    return sendError(res, 500, 'Failed to analyze resume', error.message);
  }
});

/**
 * Analyze resume-job match
 */
function analyzeMatch(resumeData, jobDescription) {
  const resumeText = JSON.stringify(resumeData).toLowerCase();
  const jobText = jobDescription.toLowerCase();

  // Extract keywords from job description
  const jobKeywords = jobText.match(/\b[a-z]{4,}\b/g) || [];
  const uniqueKeywords = [...new Set(jobKeywords)];

  const matched = [];
  const missing = [];

  for (const keyword of uniqueKeywords.slice(0, 30)) {
    if (resumeText.includes(keyword)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  return {
    matchPercentage: Math.round((matched.length / uniqueKeywords.length) * 100),
    matched: [...new Set(matched)].slice(0, 20),
    missing: [...new Set(missing)].slice(0, 20),
    suggestions: generateMatchSuggestions(matched, missing)
  };
}

/**
 * Generate suggestions based on match analysis
 */
function generateMatchSuggestions(matched, missing) {
  const suggestions = [];

  if (missing.length > 0) {
    suggestions.push(`Add these missing keywords: ${missing.slice(0, 5).join(', ')}`);
  }

  if (matched.length === 0) {
    suggestions.push('Your resume has very few matches. Consider restructuring your content to match the job description.');
  } else if (matched.length < 10) {
    suggestions.push('Try to incorporate more job-specific keywords and skills.');
  }

  return suggestions;
}

/**
 * Generate resume improvement suggestions
 */
const generateImprovements = expressAsyncHandler(async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return sendError(res, 400, 'Resume data is required');
    }

    const suggestions = generateImprovementSuggestions(data);

    return sendSuccess(res, suggestions, 'Improvement suggestions generated');
  } catch (error) {
    console.error('Generate improvements error:', error);
    return sendError(res, 500, 'Failed to generate improvements', error.message);
  }
});



/**
 * Calculate resume score
 */
const calculateResumeScore = expressAsyncHandler(async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return sendError(res, 400, 'Resume data is required');
    }

    const score = calculateScore(data);

    return sendSuccess(res, score, 'Resume score calculated');
  } catch (error) {
    console.error('Calculate score error:', error);
    return sendError(res, 500, 'Failed to calculate score', error.message);
  }
});

/**
 * Calculate resume score (0-100)
 */
function calculateScore(resumeData) {
  let score = 0;
  let maxScore = 0;
  const breakdown = {};

  // Name (10 points)
  maxScore += 10;
  breakdown.personalInfo = 0;
  if (resumeData.personalInfo?.fullName) {
    score += 10;
    breakdown.personalInfo = 10;
  }

  // Contact info (10 points)
  maxScore += 10;
  breakdown.contact = 0;
  const hasEmail = resumeData.personalInfo?.email;
  const hasPhone = resumeData.personalInfo?.phone;
  if (hasEmail && hasPhone) {
    score += 10;
    breakdown.contact = 10;
  } else if (hasEmail || hasPhone) {
    score += 5;
    breakdown.contact = 5;
  }

  // Professional summary (15 points)
  maxScore += 15;
  breakdown.summary = 0;
  if (resumeData.personalInfo?.summary) {
    if (resumeData.personalInfo.summary.length > 150) {
      score += 15;
      breakdown.summary = 15;
    } else if (resumeData.personalInfo.summary.length > 50) {
      score += 10;
      breakdown.summary = 10;
    } else {
      score += 5;
      breakdown.summary = 5;
    }
  }

  // Professional title (10 points)
  maxScore += 10;
  breakdown.title = 0;
  if (resumeData.personalInfo?.title) {
    score += 10;
    breakdown.title = 10;
  }

  // Work experience (20 points)
  maxScore += 20;
  breakdown.experience = 0;
  if (resumeData.experience && resumeData.experience.length > 0) {
    const experienceScore = Math.min(resumeData.experience.length * 5, 20);
    score += experienceScore;
    breakdown.experience = experienceScore;
  }

  // Skills (15 points)
  maxScore += 15;
  breakdown.skills = 0;
  const totalSkills = (resumeData.skills?.length || 0);
  if (totalSkills > 0) {
    const skillScore = Math.min(totalSkills * 1.5, 15);
    score += skillScore;
    breakdown.skills = skillScore;
  }

  // Technical skills (10 points)
  maxScore += 10;
  breakdown.technicalSkills = 0;
  if (resumeData.technicalSkills && resumeData.technicalSkills.length > 0) {
    const techScore = Math.min(resumeData.technicalSkills.length * 2, 10);
    score += techScore;
    breakdown.technicalSkills = techScore;
  }

  // Soft skills (10 points)
  maxScore += 10;
  breakdown.softSkills = 0;
  if (resumeData.softSkills && resumeData.softSkills.length > 0) {
    const softScore = Math.min(resumeData.softSkills.length * 2, 10);
    score += softScore;
    breakdown.softSkills = softScore;
  }

  // Education (10 points)
  maxScore += 10;
  breakdown.education = 0;
  if (resumeData.education && resumeData.education.length > 0) {
    score += 10;
    breakdown.education = 10;
  }

  // Achievements (10 points)
  maxScore += 10;
  breakdown.achievements = 0;
  if (resumeData.achievements && resumeData.achievements.length > 0) {
    const achievementScore = Math.min(resumeData.achievements.length * 3, 10);
    score += achievementScore;
    breakdown.achievements = achievementScore;
  }

  // Certifications (5 points)
  maxScore += 5;
  breakdown.certifications = 0;
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    score += 5;
    breakdown.certifications = 5;
  }

  const percentage = Math.round((score / maxScore) * 100);
  
  let level = 'Beginner';
  let recommendation = '';
  
  if (percentage >= 90) {
    level = 'Excellent';
    recommendation = 'Your resume is in great shape! You\'re ready to apply.';
  } else if (percentage >= 75) {
    level = 'Good';
    recommendation = 'Your resume is solid. Consider the suggestions to make it even better.';
  } else if (percentage >= 60) {
    level = 'Fair';
    recommendation = 'There\'s room for improvement. Focus on the high-impact suggestions.';
  } else if (percentage >= 40) {
    level = 'Needs Work';
    recommendation = 'Your resume needs significant improvements. Start with the critical items.';
  } else {
    level = 'Incomplete';
    recommendation = 'Your resume is missing key sections. Please complete the essential fields.';
  }

  return {
    score: percentage,
    level,
    recommendation,
    breakdown,
    totalScore: score,
    maxScore,
    nextMilestone: Math.ceil(percentage / 10) * 10
  };
}

/**
 * Get AI-powered improvement suggestions
 */
const getAIImprovements = expressAsyncHandler(async (req, res) => {
  try {
    const { resumeData } = req.body;

    if (!resumeData) {
      return sendError(res, 400, 'Resume data is required');
    }

    const suggestions = await generateImprovementSuggestions(resumeData);

    return sendSuccess(res, suggestions, 'AI suggestions generated successfully');
  } catch (error) {
    console.error('AI improvements error:', error);
    return sendError(res, 500, 'Failed to generate AI suggestions', error.message);
  }
});

/**
 * Generate AI-enhanced summary
 */
const generateAISummary = expressAsyncHandler(async (req, res) => {
  try {
    const { personalInfo, experience } = req.body;

    if (!personalInfo) {
      return sendError(res, 400, 'Personal info is required');
    }

    const summary = await generateImprovedSummary(personalInfo, experience || []);

    return sendSuccess(res, { summary }, 'Summary generated successfully');
  } catch (error) {
    console.error('Summary generation error:', error);
    return sendError(res, 500, 'Failed to generate summary', error.message);
  }
});

/**
 * Improve specific content with AI
 */
const improveSection = expressAsyncHandler(async (req, res) => {
  try {
    const { section, content } = req.body;

    if (!section || !content) {
      return sendError(res, 400, 'Section and content are required');
    }

    const improved = await improveContent(section, content);

    return sendSuccess(res, { improved }, 'Content improved successfully');
  } catch (error) {
    console.error('Section improvement error:', error);
    return sendError(res, 500, 'Failed to improve content', error.message);
  }
});

/**
 * Get personalized resume tips
 */
const getResumeTips = expressAsyncHandler(async (req, res) => {
  try {
    const { jobTitle, skills } = req.body;

    if (!jobTitle || !skills || !Array.isArray(skills)) {
      return sendError(res, 400, 'Job title and skills array are required');
    }

    const tips = await getPersonalizedTips(jobTitle, skills);

    return sendSuccess(res, tips, 'Tips generated successfully');
  } catch (error) {
    console.error('Tips generation error:', error);
    return sendError(res, 500, 'Failed to generate tips', error.message);
  }
});

/**
 * Check resume quality with AI insights
 */
const checkQuality = expressAsyncHandler(async (req, res) => {
  try {
    const { resumeData } = req.body;

    if (!resumeData) {
      return sendError(res, 400, 'Resume data is required');
    }

    const quality = await checkResumeQuality(resumeData);

    return sendSuccess(res, quality, 'Quality check completed');
  } catch (error) {
    console.error('Quality check error:', error);
    return sendError(res, 500, 'Failed to check quality', error.message);
  }
});

/**
 * Rewrite content with AI
 */
const rewriteContent = expressAsyncHandler(async (req, res) => {
  try {
    const { text, style } = req.body;

    if (!text) {
      return sendError(res, 400, 'Text is required');
    }

    const improved = await improveContent(style || 'professional', text);

    return sendSuccess(res, { improved }, 'Content rewritten successfully');
  } catch (error) {
    console.error('Rewrite error:', error);
    return sendError(res, 500, 'Failed to rewrite content', error.message);
  }
});

/**
 * Generate complete resume from job description
 */
const generateResumeFromJob = expressAsyncHandler(async (req, res) => {
  try {
    const { jobDescription, userInfo } = req.body;

    if (!jobDescription) {
      return sendError(res, 400, 'Job description is required');
    }

    console.log('Generating resume from job description...');
    const generatedResume = await generateResumeFromJob(jobDescription, userInfo || {});

    return sendSuccess(res, generatedResume, 'Resume generated from job description');
  } catch (error) {
    console.error('Resume generation from job error:', error);
    return sendError(res, 500, 'Failed to generate resume from job', error.message);
  }
});

/**
 * Generate section-specific content suggestions
 */
const generateSectionSuggestions = expressAsyncHandler(async (req, res) => {
  try {
    const { sectionType, context } = req.body;

    if (!sectionType) {
      return sendError(res, 400, 'Section type is required');
    }

    console.log(`Generating suggestions for ${sectionType} section...`);
    const suggestions = await generateSectionSuggestions(sectionType, context || {});

    return sendSuccess(res, { suggestions }, 'Section suggestions generated');
  } catch (error) {
    console.error('Section suggestions error:', error);
    return sendError(res, 500, 'Failed to generate section suggestions', error.message);
  }
});

/**
 * Optimize resume for specific job
 */
const optimizeResumeForJob = expressAsyncHandler(async (req, res) => {
  try {
    const { resumeData, jobDescription } = req.body;

    if (!resumeData || !jobDescription) {
      return sendError(res, 400, 'Resume data and job description are required');
    }

    console.log('Optimizing resume for job...');
    const optimizations = await optimizeResumeForJob(resumeData, jobDescription);

    return sendSuccess(res, optimizations, 'Resume optimized for job');
  } catch (error) {
    console.error('Resume optimization error:', error);
    return sendError(res, 500, 'Failed to optimize resume', error.message);
  }
});

/**
 * Generate experience description with AI
 */
const generateExperienceDescription = expressAsyncHandler(async (req, res) => {
  try {
    const { position, company, achievements } = req.body;

    if (!position || !company) {
      return sendError(res, 400, 'Position and company are required');
    }

    console.log(`Generating experience description for ${position} at ${company}...`);
    const description = await generateExperienceDescription(position, company, achievements || []);

    return sendSuccess(res, { description }, 'Experience description generated');
  } catch (error) {
    console.error('Experience generation error:', error);
    return sendError(res, 500, 'Failed to generate experience description', error.message);
  }
});

/**
 * Recommend skills based on job title
 */
const recommendSkills = expressAsyncHandler(async (req, res) => {
  try {
    const { jobTitle, currentSkills } = req.body;

    if (!jobTitle) {
      return sendError(res, 400, 'Job title is required');
    }

    console.log(`Recommending skills for ${jobTitle}...`);
    const recommendations = await recommendSkills(jobTitle, currentSkills || []);

    return sendSuccess(res, recommendations, 'Skills recommended');
  } catch (error) {
    console.error('Skills recommendation error:', error);
    return sendError(res, 500, 'Failed to recommend skills', error.message);
  }
});

/**
 * Extract and analyze SEO keywords from job description
 */
const extractSEOKeywords = expressAsyncHandler(async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return sendError(res, 400, 'Job description is required');
    }

    const result = await require('../utils/aiResumeEnhancer').extractSEOKeywordsFromJob(jobDescription);
    
    if (result.success) {
      return sendSuccess(res, result, 'SEO keywords extracted successfully');
    } else {
      return sendError(res, 500, 'Failed to extract keywords', result.error);
    }
  } catch (error) {
    console.error('SEO keyword extraction error:', error);
    return sendError(res, 500, 'Failed to extract SEO keywords', error.message);
  }
});

/**
 * Analyze SEO keyword match between resume and job description
 */
const analyzeSEOMatch = expressAsyncHandler(async (req, res) => {
  try {
    const { resumeData, jobDescription } = req.body;

    if (!resumeData || !jobDescription) {
      return sendError(res, 400, 'Resume data and job description are required');
    }

    const result = await require('../utils/aiResumeEnhancer').analyzeSEOKeywordMatch(resumeData, jobDescription);
    
    if (result.success) {
      return sendSuccess(res, result, 'SEO keyword match analyzed successfully');
    } else {
      return sendError(res, 500, 'Failed to analyze match', result.error);
    }
  } catch (error) {
    console.error('SEO match analysis error:', error);
    return sendError(res, 500, 'Failed to analyze SEO match', error.message);
  }
});

module.exports = {
  extractPdfData,
  generateResume,
  downloadResumePDF,
  saveDraft,
  getDrafts,
  deleteDraft,
  analyzeResumeMatch,
  generateImprovements,
  calculateResumeScore,
  getAIImprovements,
  generateAISummary,
  improveSection,
  getResumeTips,
  checkQuality,
  rewriteContent,
  generateResumeFromJob,
  generateSectionSuggestions,
  optimizeResumeForJob,
  generateExperienceDescription,
  recommendSkills,
  extractSEOKeywords,
  analyzeSEOMatch
};
