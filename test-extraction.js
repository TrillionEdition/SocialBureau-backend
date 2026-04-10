// Test file: test-extraction.js
// Run this from SocialBureau-backend with: node test-extraction.js

const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Test extraction functions
const {
  extractSoftSkills,
  extractTechnicalSkills,
  extractAchievements,
  extractDetailedCertifications,
  generateSummary,
  validateAndEnrichData,
  improveTextExtraction
} = require('./utils/extractionEnhancer');

console.log('🧪 Testing Extraction Functions...\n');

// Test 1: Test improveTextExtraction
console.log('✅ Test 1: Text Improvement');
const rawText = `John    Doe

Senior    Software    Engineer
john@example.com | +1-555-123-4567`;

const improved = improveTextExtraction(rawText);
console.log('Input:', JSON.stringify(rawText));
console.log('Output:', JSON.stringify(improved));
console.log('');

// Test 2: Test soft skills extraction
console.log('✅ Test 2: Soft Skills Extraction');
const sampleText = `
Experienced team leader with strong communication skills.
Excellent problem-solving and creative thinking abilities.
Proven leadership and teamwork capabilities.
`;
const softSkills = extractSoftSkills(sampleText);
console.log('Text:', sampleText.trim());
console.log('Extracted Skills:', softSkills);
console.log('');

// Test 3: Test technical skills extraction
console.log('✅ Test 3: Technical Skills Extraction');
const techText = `
Proficient in JavaScript, Python, and React.
Experienced with Node.js, Express, and MongoDB.
Familiar with AWS and Docker.
`;
const techSkills = extractTechnicalSkills(techText);
console.log('Text:', techText.trim());
console.log('Extracted Skills:', techSkills);
console.log('');

// Test 4: Test achievements extraction
console.log('✅ Test 4: Achievements Extraction');
const achieveText = `
Led team of 5 engineers to deliver project 20% ahead of schedule.
Increased application performance by 40%.
Reduced bug reports by 60% through improved testing.
`;
const achievements = extractAchievements(achieveText);
console.log('Text:', achieveText.trim());
console.log('Extracted Achievements:', achievements);
console.log('');

// Test 5: Test certifications extraction
console.log('✅ Test 5: Certifications Extraction');
const certText = `
Certified AWS Solutions Architect - 2023
Google Cloud Professional Certificate
Certified Kubernetes Administrator
`;
const certs = extractDetailedCertifications(certText);
console.log('Text:', certText.trim());
console.log('Extracted Certifications:', certs);
console.log('');

// Test 6: Test summary generation
console.log('✅ Test 6: Summary Generation');
(async () => {
  const introText = `John Doe is a Senior Software Engineer with 8 years of experience 
in full-stack development. He specializes in JavaScript, React, and Node.js. 
He has led multiple teams and delivered enterprise-level applications.`;
  
  try {
    const summary = await generateSummary(introText);
    console.log('Generated Summary:', summary);
    console.log('');
  } catch (error) {
    console.error('Summary generation error:', error.message);
  }

  // Test 7: Test data validation
  console.log('✅ Test 7: Data Validation & Enrichment');
  const sampleData = {
    personalInfo: { fullName: 'John Doe' },
    experience: ['Senior Engineer at Tech Corp'],
    skills: ['JavaScript', 'javascript', 'React'], // Duplicate
    softSkills: [],
    achievements: []
  };

  const enriched = validateAndEnrichData(sampleData);
  console.log('Original skills:', sampleData.skills);
  console.log('Deduplicated skills:', enriched.skills);
  console.log('Added softSkills:', enriched.softSkills.length, 'found');
  console.log('Added achievements:', enriched.achievements.length, 'found');
  console.log('');

  // Test 8: Test with a real PDF if available
  console.log('✅ Test 8: Check for Test Resume PDF');
  const testPdfPath = path.join(__dirname, 'test-resume.pdf');
  if (fs.existsSync(testPdfPath)) {
    console.log(`Found test resume at: ${testPdfPath}`);
    const data = fs.readFileSync(testPdfPath);
    try {
      const pdfData = await pdfParse(data);
      console.log('PDF parsed successfully');
      console.log('Text length:', pdfData.text.length);
      console.log('First 200 chars:', pdfData.text.substring(0, 200));
    } catch (error) {
      console.error('PDF parsing error:', error.message);
    }
  } else {
    console.log('No test-resume.pdf found (not required for testing)');
  }

  console.log('\n✅ All tests completed!');
})();
