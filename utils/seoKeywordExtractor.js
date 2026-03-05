/**
 * SEO Keyword Extraction and Optimization for Resumes
 * Extracts relevant keywords from job descriptions and optimizes resume content
 */

/**
 * Extract SEO keywords from job description
 * Returns ranked keywords for natural incorporation
 */
const extractSEOKeywords = (jobDescription) => {
  try {
    if (!jobDescription || typeof jobDescription !== 'string') {
      return { keywords: [], technicalSkills: [], softSkills: [], tools: [] };
    }

    const text = jobDescription.toLowerCase();
    
    // Technical skills and tools to search for
    const technicalKeywords = [
      // Programming Languages
      'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'golang', 'rust', 'typescript', 'php',
      'swift', 'kotlin', 'r programming', 'scala', 'perl', 'groovy',
      
      // Frameworks & Libraries
      'react', 'angular', 'vue', 'express', 'django', 'flask', 'spring', 'hibernate',
      'nodejs', 'asp.net', 'laravel', 'symfony', 'fastapi', 'nextjs', 'nuxt',
      
      // Databases
      'mongodb', 'mysql', 'postgresql', 'redis', 'cassandra', 'elasticsearch',
      'dynamodb', 'oracle', 'sql server', 'firebase', 'supabase', 'mariadb',
      
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform',
      'ansible', 'cloud computing', 'microservices', 'serverless',
      
      // Data & Analytics
      'data analysis', 'data science', 'machine learning', 'deep learning', 'nlp',
      'big data', 'apache spark', 'hadoop', 'tableau', 'power bi', 'sql',
      'pandas', 'scikit-learn', 'tensorflow', 'pytorch',
      
      // Mobile
      'android development', 'ios development', 'react native', 'flutter', 'xamarin',
      
      // Other Technical
      'rest api', 'graphql', 'websockets', 'agile', 'scrum', 'git', 'linux',
      'unix', 'windows', 'macos', 'testing', 'unit testing', 'integration testing',
      'automation', 'security', 'oauth', 'jwt', 'blockchain'
    ];

    const softSkills = [
      'leadership', 'communication', 'teamwork', 'collaboration', 'problem solving',
      'critical thinking', 'project management', 'time management', 'adaptability',
      'creativity', 'analytical skills', 'decision making', 'strategic thinking',
      'stakeholder management', 'mentoring', 'conflict resolution', 'presentation skills',
      'negotiation', 'customer service', 'attention to detail', 'organization'
    ];

    const methodologies = [
      'agile', 'scrum', 'kanban', 'waterfall', 'devops', 'continuous integration',
      'continuous deployment', 'test driven development', 'behavior driven development',
      'mvp', 'lean', 'six sigma', 'pair programming', 'code review'
    ];

    const extractedKeywords = {
      technicalSkills: [],
      softSkills: [],
      methodologies: [],
      tools: [],
      allKeywords: []
    };

    // Extract technical skills
    technicalKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        extractedKeywords.technicalSkills.push(keyword);
      }
    });

    // Extract soft skills
    softSkills.forEach(skill => {
      if (text.includes(skill.toLowerCase())) {
        extractedKeywords.softSkills.push(skill);
      }
    });

    // Extract methodologies
    methodologies.forEach(method => {
      if (text.includes(method.toLowerCase())) {
        extractedKeywords.methodologies.push(method);
      }
    });

    // Extract years of experience requirement
    const yearsMatch = jobDescription.match(/(\d+)\+?\s*years?\s*of/i);
    const yearsRequired = yearsMatch ? parseInt(yearsMatch[1]) : null;

    // Combine all keywords and ensure uniqueness
    extractedKeywords.allKeywords = [
      ...new Set([
        ...extractedKeywords.technicalSkills,
        ...extractedKeywords.softSkills,
        ...extractedKeywords.methodologies
      ])
    ];

    return {
      keywords: extractedKeywords.allKeywords,
      technicalSkills: extractedKeywords.technicalSkills,
      softSkills: extractedKeywords.softSkills,
      methodologies: extractedKeywords.methodologies,
      yearsRequired,
      count: extractedKeywords.allKeywords.length
    };
  } catch (error) {
    console.error('Error extracting SEO keywords:', error);
    return { keywords: [], technicalSkills: [], softSkills: [], methodologies: [], count: 0 };
  }
};

/**
 * Incorporate SEO keywords naturally into text
 * Maintains readability while optimizing for keyword presence
 */
const incorporateSEOKeywords = (text, keywords, density = 0.02) => {
  try {
    if (!text || !keywords || keywords.length === 0) {
      return text;
    }

    let enhancedText = text;
    const targetKeywordCount = Math.max(1, Math.floor((text.split(' ').length * density)));
    let incorporatedCount = 0;

    // Sort keywords by length (longer ones first to avoid partial matches)
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      if (incorporatedCount >= targetKeywordCount) break;

      // Check if keyword already exists
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (!keywordRegex.test(enhancedText)) {
        // Find a good place to insert the keyword
        const sentences = enhancedText.split(/(?<=[.!?])\s+/);
        if (sentences.length > 0) {
          const randomSentenceIndex = Math.floor(Math.random() * sentences.length);
          const insertPoint = sentences[randomSentenceIndex].lastIndexOf(' ');
          
          if (insertPoint > 0) {
            const sentence = sentences[randomSentenceIndex];
            sentences[randomSentenceIndex] = 
              sentence.substring(0, insertPoint) + ` ${keyword}` + sentence.substring(insertPoint);
            enhancedText = sentences.join(' ');
            incorporatedCount++;
          }
        }
      } else {
        incorporatedCount++;
      }
    }

    return enhancedText;
  } catch (error) {
    console.error('Error incorporating keywords:', error);
    return text;
  }
};

/**
 * Generate SEO-optimized professional summary
 */
const generateSEOOptimizedSummary = (jobTitle, skills, keywords, experience) => {
  try {
    const primaryKeywords = keywords.slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');
    const technicalSkillsStr = skills.slice(0, 3).join(', ');

    const summaries = [
      `Results-driven ${jobTitle} with expertise in ${technicalSkillsStr}. Skilled in ${primaryKeywords}. ${experience || 'Proven'} track record of delivering high-quality solutions.`,
      `Accomplished ${jobTitle} specializing in ${primaryKeywords} and ${technicalSkillsStr}. Experienced in developing scalable solutions with strong technical foundation.`,
      `${jobTitle} professional with deep knowledge of ${technicalSkillsStr} and ${primaryKeywords}. Committed to creating efficient, maintainable code and fostering collaborative environments.`,
      `Competent ${jobTitle} with ${experience || 'extensive'} background in ${primaryKeywords}. Proficient in ${technicalSkillsStr} with demonstrated ability to solve complex problems.`,
      `Innovative ${jobTitle} leveraging ${technicalSkillsStr} and ${primaryKeywords} expertise. Focused on delivering robust solutions and continuous professional growth.`
    ];

    return summaries[Math.floor(Math.random() * summaries.length)];
  } catch (error) {
    console.error('Error generating SEO summary:', error);
    return '';
  }
};

/**
 * Generate SEO-optimized experience description
 * Incorporates relevant keywords naturally
 */
const generateSEOOptimizedExperience = (role, company, keywords, achievements = []) => {
  try {
    const primaryKeywords = keywords.slice(0, 5);
    const formattedKeywords = primaryKeywords.slice(0, 2).join(' and ');
    const additionalKeywords = primaryKeywords.slice(2, 4);

    const baseDescription = `${role} at ${company}, responsible for developing and maintaining applications using ${formattedKeywords}. ${
      achievements && achievements.length > 0
        ? `Key achievements include: ${achievements.slice(0, 2).join(', ')}.`
        : 'Delivered high-quality solutions with strong technical foundation.'
    } Collaborated with cross-functional teams to implement best practices in ${additionalKeywords.join(', ')}.`;

    return baseDescription;
  } catch (error) {
    console.error('Error generating SEO experience:', error);
    return '';
  }
};

/**
 * Generate SEO keywords tips
 * Provides recommendations for keyword optimization
 */
const generateSEOKeywordTips = (jobDescription, extractedKeywords) => {
  try {
    const tips = [];

    if (extractedKeywords.technicalSkills.length > 0) {
      tips.push({
        category: 'Technical Skills',
        keywords: extractedKeywords.technicalSkills.slice(0, 5),
        tip: `Highlight these technical skills prominently: ${extractedKeywords.technicalSkills
          .slice(0, 3)
          .join(', ')}`,
        priority: 'high'
      });
    }

    if (extractedKeywords.softSkills.length > 0) {
      tips.push({
        category: 'Soft Skills',
        keywords: extractedKeywords.softSkills.slice(0, 4),
        tip: `Emphasize soft skills like ${extractedKeywords.softSkills.slice(0, 2).join(', ')} in your experience descriptions`,
        priority: 'medium'
      });
    }

    if (extractedKeywords.methodologies.length > 0) {
      tips.push({
        category: 'Methodologies',
        keywords: extractedKeywords.methodologies,
        tip: `Show proficiency in ${extractedKeywords.methodologies.slice(0, 2).join(' and ')} for ATS compatibility`,
        priority: 'high'
      });
    }

    // Add keyword density tip
    tips.push({
      category: 'Keyword Strategy',
      keywords: ['keyword-density', 'ats-optimization'],
      tip: `Include job description keywords naturally in your summary and experience sections. Aim for 10-15% keyword density without keyword stuffing.`,
      priority: 'high'
    });

    // Add ATS optimization tip
    tips.push({
      category: 'ATS Optimization',
      keywords: ['ats-friendly', 'formatting'],
      tip: 'Use standard formatting and include exact keywords from the job description to pass ATS screening',
      priority: 'high'
    });

    // Add cover letter tip
    tips.push({
      category: 'Cover Letter',
      keywords: ['cover-letter', 'matching'],
      tip: `Ensure your cover letter uses similar keywords and demonstrates alignment with the job requirements`,
      priority: 'medium'
    });

    return tips;
  } catch (error) {
    console.error('Error generating SEO tips:', error);
    return [];
  }
};

/**
 * Analyze keyword match between resume and job description
 */
const analyzeKeywordMatch = (resumeText, jobDescription) => {
  try {
    const jobKeywords = extractSEOKeywords(jobDescription);
    const resumeText_lower = resumeText.toLowerCase();

    const matchedKeywords = {
      technical: [],
      soft: [],
      methodologies: []
    };

    // Check technical skills match
    jobKeywords.technicalSkills.forEach(skill => {
      if (resumeText_lower.includes(skill.toLowerCase())) {
        matchedKeywords.technical.push(skill);
      }
    });

    // Check soft skills match
    jobKeywords.softSkills.forEach(skill => {
      if (resumeText_lower.includes(skill.toLowerCase())) {
        matchedKeywords.soft.push(skill);
      }
    });

    // Check methodologies match
    jobKeywords.methodologies.forEach(method => {
      if (resumeText_lower.includes(method.toLowerCase())) {
        matchedKeywords.methodologies.push(method);
      }
    });

    const matchPercentage = Math.round(
      (matchedKeywords.technical.length + matchedKeywords.soft.length + matchedKeywords.methodologies.length) /
        jobKeywords.allKeywords.length * 100
    );

    return {
      matchPercentage,
      matchedKeywords,
      missingKeywords: {
        technical: jobKeywords.technicalSkills.filter(s => !matchedKeywords.technical.includes(s)),
        soft: jobKeywords.softSkills.filter(s => !matchedKeywords.soft.includes(s)),
        methodologies: jobKeywords.methodologies.filter(s => !matchedKeywords.methodologies.includes(s))
      },
      totalJobKeywords: jobKeywords.allKeywords.length,
      totalMatched: matchedKeywords.technical.length + matchedKeywords.soft.length + matchedKeywords.methodologies.length
    };
  } catch (error) {
    console.error('Error analyzing keyword match:', error);
    return { matchPercentage: 0, matchedKeywords: {}, missingKeywords: {}, totalMatched: 0 };
  }
};

/**
 * Generate SEO-optimized resume with keyword incorporation
 */
const generateSEOOptimizedResume = (baseResume, jobDescription) => {
  try {
    const keywords = extractSEOKeywords(jobDescription);

    if (!baseResume) {
      return { baseResume, keywords, optimized: false };
    }

    const optimizedResume = { ...baseResume };

    // Enhance summary with keywords
    if (optimizedResume.personalInfo && optimizedResume.personalInfo.summary) {
      optimizedResume.personalInfo.summary = incorporateSEOKeywords(
        optimizedResume.personalInfo.summary,
        keywords.keywords,
        0.03
      );
    }

    // Enhance experience descriptions with keywords
    if (optimizedResume.experience && Array.isArray(optimizedResume.experience)) {
      optimizedResume.experience = optimizedResume.experience.map(exp => ({
        ...exp,
        description: incorporateSEOKeywords(exp.description || '', keywords.keywords, 0.025)
      }));
    }

    // Add missing keywords to skills if not present
    if (optimizedResume.skills && Array.isArray(optimizedResume.skills)) {
      const existingSkills = optimizedResume.skills.map(s => s.toLowerCase());
      keywords.keywords.forEach(keyword => {
        if (!existingSkills.includes(keyword.toLowerCase())) {
          optimizedResume.skills.push(keyword);
        }
      });
    }

    return {
      optimizedResume,
      seoAnalysis: {
        keywords: keywords.keywords,
        technicalSkills: keywords.technicalSkills,
        softSkills: keywords.softSkills,
        methodologies: keywords.methodologies
      },
      optimized: true
    };
  } catch (error) {
    console.error('Error generating SEO-optimized resume:', error);
    return { baseResume, optimized: false, error: error.message };
  }
};

module.exports = {
  extractSEOKeywords,
  incorporateSEOKeywords,
  generateSEOOptimizedSummary,
  generateSEOOptimizedExperience,
  generateSEOKeywordTips,
  analyzeKeywordMatch,
  generateSEOOptimizedResume
};
