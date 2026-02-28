// // // // // const pdf = require('pdf-parse');
// // // // // const natural = require('natural');
// // // // // const stopword = require('stopword');

// // // // // const { PorterStemmer, WordTokenizer } = natural;
// // // // // const tokenizer = new WordTokenizer();

// // // // // const SKILLS_DICTIONARY = {
// // // // //     languages: ['python', 'javascript', 'java', 'c++', 'go', 'rust', 'php', 'swift', 'kotlin', 'typescript', 'sql', 'ruby'],
// // // // //     frameworks: ['react', 'angular', 'vue', 'django', 'express', 'spring', 'laravel', 'flutter', 'next.js', 'svelte', 'fastapi'],
// // // // //     tools: ['docker', 'kubernetes', 'git', 'jenkins', 'aws', 'gcp', 'azure', 'terraform', 'linux', 'ansible', 'nginx', 'redis'],
// // // // //     softSkills: ['leadership', 'communication', 'teamwork', 'agile', 'scrum', 'problem-solving', 'critical thinking', 'time management']
// // // // // };

// // // // // const SECTIONS_REGEX = {
// // // // //     Experience: /(experience|work history|employment history|professional experience|background)/i,
// // // // //     Education: /(education|academic background|qualifications)/i,
// // // // //     Skills: /(skills|technical skills|competencies|expertise)/i,
// // // // //     Summary: /(summary|objective|professional profile|about me)/i,
// // // // //     Certifications: /(certifications|licenses|awards|courses)/i,
// // // // //     Projects: /(projects|personal projects|portfolio|academic projects)/i
// // // // // };

// // // // // const extractTextFromPDF = async (buffer) => {
// // // // //     try {
// // // // //         const data = await pdf(buffer);
// // // // //         return data.text;
// // // // //     } catch (error) {
// // // // //         console.error('Error extracting PDF text:', error);
// // // // //         throw new Error('Failed to extract text from PDF');
// // // // //     }
// // // // // };

// // // // // const extractKeywords = (text) => {
// // // // //     if (!text) return [];
// // // // //     const tokens = tokenizer.tokenize(text.toLowerCase());
// // // // //     const filtered = stopword.removeStopwords(tokens);
// // // // //     const stemmed = filtered.map(word => PorterStemmer.stem(word));
// // // // //     return [...new Set(stemmed)];
// // // // // };

// // // // // const extractSkills = (text) => {
// // // // //     const foundSkills = [];
// // // // //     const lowerText = text.toLowerCase();

// // // // //     Object.values(SKILLS_DICTIONARY).flat().forEach(skill => {
// // // // //         const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
// // // // //         if (regex.test(lowerText)) {
// // // // //             foundSkills.push(skill);
// // // // //         }
// // // // //     });

// // // // //     return [...new Set(foundSkills)];
// // // // // };

// // // // // const detectSections = (text) => {
// // // // //     const results = {};
// // // // //     Object.keys(SECTIONS_REGEX).forEach(section => {
// // // // //         results[section] = SECTIONS_REGEX[section].test(text);
// // // // //     });
// // // // //     return results;
// // // // // };

// // // // // const checkFormatting = (text) => {
// // // // //     let score = 100;
// // // // //     const wordCount = text.trim().split(/\s+/).length;

// // // // //     if (wordCount < 300 || wordCount > 800) {
// // // // //         score -= 20;
// // // // //     }

// // // // //     const specialChars = text.match(/[^a-zA-Z0-9\s]/g) || [];
// // // // //     if (specialChars.length / text.length > 0.05) {
// // // // //         score -= 15;
// // // // //     }

// // // // //     const pipes = (text.match(/\|/g) || []).length;
// // // // //     if (pipes > 5) {
// // // // //         score -= 15;
// // // // //     }

// // // // //     const breaks = (text.match(/\n/g) || []).length;
// // // // //     if (breaks > 10 && breaks < 100) {
// // // // //         score += 5;
// // // // //     }

// // // // //     return Math.max(0, Math.min(100, score));
// // // // // };

// // // // // const generateSuggestions = (result) => {
// // // // //     const suggestions = [];
// // // // //     const { subScores, sectionChecklist, matchedKeywords, missingKeywords, skillGaps } = result;

// // // // //     if (subScores.keywordMatch < 50) {
// // // // //         suggestions.push("Tailor your resume more specifically to this role");
// // // // //     }

// // // // //     if (missingKeywords.length > 5) {
// // // // //         suggestions.push(`Add these missing keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
// // // // //     }

// // // // //     if (!sectionChecklist.Summary) {
// // // // //         suggestions.push("Add a professional summary at the top");
// // // // //     }

// // // // //     if (!sectionChecklist.Projects) {
// // // // //         suggestions.push("Add a Projects section to showcase hands-on work");
// // // // //     }

// // // // //     if (!sectionChecklist.Certifications) {
// // // // //         suggestions.push("Add relevant certifications to strengthen your profile");
// // // // //     }

// // // // //     if (skillGaps.length > 0) {
// // // // //         suggestions.push(`Missing skills from job description: ${skillGaps.slice(0, 5).join(', ')}`);
// // // // //     }

// // // // //     if (subScores.formatting < 60) {
// // // // //         suggestions.push("Keep resume between 300-800 words, avoid tables and special characters");
// // // // //     }

// // // // //     if (subScores.keywordMatch < 50) {
// // // // //         suggestions.push("Mirror the exact language from the job description");
// // // // //     }

// // // // //     return [...new Set(suggestions)];
// // // // // };

// // // // // const calculateScore = (resumeText, jobDescription) => {
// // // // //     const resumeKeywords = extractKeywords(resumeText);
// // // // //     const jdKeywords = extractKeywords(jobDescription);
// // // // //     const resumeSkills = extractSkills(resumeText);
// // // // //     const jdSkills = extractSkills(jobDescription);

// // // // //     const matchedKeywords = jdKeywords.filter(kw => resumeKeywords.includes(kw));
// // // // //     const missingKeywords = jdKeywords.filter(kw => !resumeKeywords.includes(kw));

// // // // //     const matchedSkills = jdSkills.filter(skill => resumeSkills.includes(skill));
// // // // //     const skillGaps = jdSkills.filter(skill => !resumeSkills.includes(skill));

// // // // //     const sectionChecklist = detectSections(resumeText);
// // // // //     const formattingScore = checkFormatting(resumeText);

// // // // //     const keywordMatchScore = jdKeywords.length > 0 ? (matchedKeywords.length / jdKeywords.length) * 100 : 100;
// // // // //     const skillMatchScore = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 100;

// // // // //     const sectionsCount = Object.values(sectionChecklist).filter(Boolean).length;
// // // // //     const sectionCompletenessScore = (sectionsCount / Object.keys(sectionChecklist).length) * 100;

// // // // //     const weightedScore = Math.round(
// // // // //         (keywordMatchScore * 0.35) +
// // // // //         (skillMatchScore * 0.30) +
// // // // //         (sectionCompletenessScore * 0.20) +
// // // // //         (formattingScore * 0.15)
// // // // //     );

// // // // //     const result = {
// // // // //         score: weightedScore,
// // // // //         matchedKeywords: matchedKeywords.slice(0, 10),
// // // // //         missingKeywords: missingKeywords.slice(0, 10),
// // // // //         sectionChecklist,
// // // // //         skillGaps: skillGaps,
// // // // //         subScores: {
// // // // //             keywordMatch: Math.round(keywordMatchScore),
// // // // //             sectionCompleteness: Math.round(sectionCompletenessScore),
// // // // //             skillMatch: Math.round(skillMatchScore),
// // // // //             formatting: Math.round(formattingScore)
// // // // //         }
// // // // //     };

// // // // //     result.suggestions = generateSuggestions(result);

// // // // //     return result;
// // // // // };

// // // // // module.exports = {
// // // // //     extractTextFromPDF,
// // // // //     calculateScore
// // // // // };



// // // // const pdf = require('pdf-parse');
// // // // const natural = require('natural');
// // // // const stopword = require('stopword');

// // // // const { PorterStemmer, WordTokenizer, TfIdf } = natural;
// // // // const tokenizer = new WordTokenizer();

// // // // // ─── Section Detection (universal) ──────────────────────────────────────────
// // // // const SECTIONS_REGEX = {
// // // //     Experience: /(experience|work history|employment history|professional experience|background|career history)/i,
// // // //     Education: /(education|academic background|qualifications|degree|university|college)/i,
// // // //     Skills: /(skills|technical skills|competencies|expertise|proficiencies|abilities)/i,
// // // //     Summary: /(summary|objective|professional profile|about me|overview|profile)/i,
// // // //     Certifications: /(certifications|licenses|awards|courses|accreditations|credentials)/i,
// // // //     Projects: /(projects|personal projects|portfolio|academic projects|case studies|work samples)/i,
// // // // };

// // // // // ─── PDF Extraction ───────────────────────────────────────────────────────────
// // // // const extractTextFromPDF = async (buffer) => {
// // // //     try {
// // // //         const data = await pdf(buffer);
// // // //         return data.text;
// // // //     } catch (error) {
// // // //         console.error('Error extracting PDF text:', error);
// // // //         throw new Error('Failed to extract text from PDF');
// // // //     }
// // // // };

// // // // // ─── General Keyword Extraction (stemmed, stop-word filtered) ────────────────
// // // // const extractKeywords = (text) => {
// // // //     if (!text) return [];
// // // //     const tokens = tokenizer.tokenize(text.toLowerCase());
// // // //     const filtered = stopword.removeStopwords(tokens);
// // // //     const stemmed = filtered.map((word) => PorterStemmer.stem(word));
// // // //     return [...new Set(stemmed)];
// // // // };

// // // // // ─── Dynamic Skill / Phrase Extraction from any JD ───────────────────────────
// // // // /**
// // // //  * Extracts meaningful skill/tool/requirement phrases from the job description.
// // // //  * Uses n-grams (1–3 words) and TF-IDF to surface the most relevant terms,
// // // //  * instead of relying on a hardcoded tech-only dictionary.
// // // //  */
// // // // const extractDynamicSkills = (text) => {
// // // //     if (!text) return [];

// // // //     const lower = text.toLowerCase();

// // // //     // --- 1. Single-word important terms via TF-IDF -------------------------
// // // //     const tfidf = new TfIdf();
// // // //     tfidf.addDocument(lower);
// // // //     const singleTerms = [];
// // // //     tfidf.listTerms(0).forEach(({ term, tfidf: score }) => {
// // // //         if (score > 0 && term.length > 2) singleTerms.push(term);
// // // //     });

// // // //     // --- 2. Bigrams and trigrams -------------------------------------------
// // // //     const words = lower.match(/\b[a-z][a-z0-9+#.\-]{1,30}\b/g) || [];
// // // //     const ngrams = [];

// // // //     for (let i = 0; i < words.length - 1; i++) {
// // // //         ngrams.push(`${words[i]} ${words[i + 1]}`);
// // // //         if (i < words.length - 2) {
// // // //             ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
// // // //         }
// // // //     }

// // // //     // --- 3. Filter n-grams that look like requirements/skills --------------
// // // //     // Heuristic: keep phrases that appear in requirement-dense lines
// // // //     const requirementLines = lower
// // // //         .split('\n')
// // // //         .filter((line) =>
// // // //             /(\brequir|\bresponsib|\bmust\b|\bshould\b|\bpreferr|\bqualif|\bexperi|\bknowledge\b|\bskill|\bability|\bfamiliar|\bproficien)/i.test(line)
// // // //         )
// // // //         .join(' ');

// // // //     const filteredNgrams = ngrams.filter((ng) => {
// // // //         // Appears in a requirement line
// // // //         if (!requirementLines.includes(ng)) return false;
// // // //         // Neither word is a stop word
// // // //         const parts = ng.split(' ');
// // // //         const cleaned = stopword.removeStopwords(parts);
// // // //         return cleaned.length === parts.length;
// // // //     });

// // // //     // --- 4. Deduplicate and combine ----------------------------------------
// // // //     const combined = [...new Set([...singleTerms.slice(0, 60), ...filteredNgrams])];
// // // //     return combined;
// // // // };

// // // // /**
// // // //  * Given extracted phrases from the JD, check which ones appear in the resume.
// // // //  */
// // // // const matchDynamicSkills = (resumeText, jdSkills) => {
// // // //     const lowerResume = resumeText.toLowerCase();
// // // //     const matched = [];
// // // //     const gaps = [];

// // // //     jdSkills.forEach((skill) => {
// // // //         // Escape special regex chars
// // // //         const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// // // //         const regex = new RegExp(`\\b${escaped}\\b`, 'i');
// // // //         if (regex.test(lowerResume)) {
// // // //             matched.push(skill);
// // // //         } else {
// // // //             gaps.push(skill);
// // // //         }
// // // //     });

// // // //     return { matched, gaps };
// // // // };

// // // // // ─── Section Detection ────────────────────────────────────────────────────────
// // // // const detectSections = (text) => {
// // // //     const results = {};
// // // //     Object.keys(SECTIONS_REGEX).forEach((section) => {
// // // //         results[section] = SECTIONS_REGEX[section].test(text);
// // // //     });
// // // //     return results;
// // // // };

// // // // // ─── Formatting Check ─────────────────────────────────────────────────────────
// // // // const checkFormatting = (text) => {
// // // //     let score = 100;
// // // //     const wordCount = text.trim().split(/\s+/).length;

// // // //     if (wordCount < 300 || wordCount > 800) score -= 20;

// // // //     const specialChars = text.match(/[^a-zA-Z0-9\s]/g) || [];
// // // //     if (specialChars.length / text.length > 0.05) score -= 15;

// // // //     const pipes = (text.match(/\|/g) || []).length;
// // // //     if (pipes > 5) score -= 15;

// // // //     const breaks = (text.match(/\n/g) || []).length;
// // // //     if (breaks > 10 && breaks < 100) score += 5;

// // // //     return Math.max(0, Math.min(100, score));
// // // // };

// // // // // ─── Suggestion Generator ─────────────────────────────────────────────────────
// // // // const generateSuggestions = (result) => {
// // // //     const suggestions = [];
// // // //     const { subScores, sectionChecklist, missingKeywords, skillGaps } = result;

// // // //     if (subScores.keywordMatch < 50) {
// // // //         suggestions.push('Tailor your resume more specifically to this role — mirror the exact language from the job description.');
// // // //     }

// // // //     if (missingKeywords.length > 3) {
// // // //         suggestions.push(`Incorporate these missing keywords naturally into your resume: ${missingKeywords.slice(0, 5).join(', ')}.`);
// // // //     }

// // // //     if (!sectionChecklist.Summary) {
// // // //         suggestions.push('Add a concise professional summary at the top of your resume.');
// // // //     }

// // // //     if (!sectionChecklist.Projects) {
// // // //         suggestions.push('Add a Projects section to showcase relevant hands-on work.');
// // // //     }

// // // //     if (!sectionChecklist.Certifications) {
// // // //         suggestions.push('Consider adding relevant certifications or courses to strengthen your profile.');
// // // //     }

// // // //     if (skillGaps.length > 0) {
// // // //         suggestions.push(`Address these skill/requirement gaps from the job description: ${skillGaps.slice(0, 5).join(', ')}.`);
// // // //     }

// // // //     if (subScores.formatting < 60) {
// // // //         suggestions.push('Keep your resume between 300–800 words and avoid tables, pipes, and excessive special characters.');
// // // //     }

// // // //     if (subScores.sectionCompleteness < 60) {
// // // //         suggestions.push('Ensure your resume has clearly labelled sections: Summary, Experience, Education, Skills, and Projects.');
// // // //     }

// // // //     return [...new Set(suggestions)];
// // // // };

// // // // // ─── Main Scoring Function ────────────────────────────────────────────────────
// // // // const calculateScore = (resumeText, jobDescription) => {
// // // //     // 1. Keyword overlap (stemmed)
// // // //     const resumeKeywords = extractKeywords(resumeText);
// // // //     const jdKeywords = extractKeywords(jobDescription);

// // // //     const matchedKeywords = jdKeywords.filter((kw) => resumeKeywords.includes(kw));
// // // //     const missingKeywords = jdKeywords.filter((kw) => !resumeKeywords.includes(kw));

// // // //     // 2. Dynamic skill/requirement matching (raw phrases from JD)
// // // //     const jdSkills = extractDynamicSkills(jobDescription);
// // // //     const { matched: matchedSkills, gaps: skillGaps } = matchDynamicSkills(resumeText, jdSkills);

// // // //     // 3. Structural sections
// // // //     const sectionChecklist = detectSections(resumeText);

// // // //     // 4. Formatting
// // // //     const formattingScore = checkFormatting(resumeText);

// // // //     // 5. Sub-scores
// // // //     const keywordMatchScore =
// // // //         jdKeywords.length > 0 ? (matchedKeywords.length / jdKeywords.length) * 100 : 100;
// // // //     const skillMatchScore =
// // // //         jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 100;
// // // //     const sectionsCount = Object.values(sectionChecklist).filter(Boolean).length;
// // // //     const sectionCompletenessScore = (sectionsCount / Object.keys(sectionChecklist).length) * 100;

// // // //     // 6. Weighted total
// // // //     const weightedScore = Math.round(
// // // //         keywordMatchScore * 0.35 +
// // // //         skillMatchScore * 0.30 +
// // // //         sectionCompletenessScore * 0.20 +
// // // //         formattingScore * 0.15
// // // //     );

// // // //     const result = {
// // // //         score: weightedScore,
// // // //         matchedKeywords: matchedKeywords.slice(0, 10),
// // // //         missingKeywords: missingKeywords.slice(0, 10),
// // // //         sectionChecklist,
// // // //         skillGaps: skillGaps.slice(0, 15),
// // // //         matchedSkills: matchedSkills.slice(0, 15),
// // // //         subScores: {
// // // //             keywordMatch: Math.round(keywordMatchScore),
// // // //             skillMatch: Math.round(skillMatchScore),
// // // //             sectionCompleteness: Math.round(sectionCompletenessScore),
// // // //             formatting: Math.round(formattingScore),
// // // //         },
// // // //     };

// // // //     result.suggestions = generateSuggestions(result);
// // // //     return result;
// // // // };

// // // // module.exports = {
// // // //     extractTextFromPDF,
// // // //     calculateScore,
// // // // };

// // // const pdf = require('pdf-parse');
// // // const natural = require('natural');
// // // const stopword = require('stopword');
// // // const Tesseract = require('tesseract.js');

// // // const { PorterStemmer, WordTokenizer, TfIdf } = natural;
// // // const tokenizer = new WordTokenizer();

// // // // ─── Supported MIME Types ─────────────────────────────────────────────────────
// // // const SUPPORTED_IMAGE_TYPES = [
// // //     'image/jpeg',
// // //     'image/jpg',
// // //     'image/png',
// // //     'image/webp',
// // //     'image/bmp',
// // //     'image/tiff',
// // // ];

// // // const SUPPORTED_TYPES = ['application/pdf', ...SUPPORTED_IMAGE_TYPES];

// // // // ─── Section Detection (universal) ───────────────────────────────────────────
// // // const SECTIONS_REGEX = {
// // //     Experience: /(experience|work history|employment history|professional experience|background|career history)/i,
// // //     Education: /(education|academic background|qualifications|degree|university|college)/i,
// // //     Skills: /(skills|technical skills|competencies|expertise|proficiencies|abilities)/i,
// // //     Summary: /(summary|objective|professional profile|about me|overview|profile)/i,
// // //     Certifications: /(certifications|licenses|awards|courses|accreditations|credentials)/i,
// // //     Projects: /(projects|personal projects|portfolio|academic projects|case studies|work samples)/i,
// // // };

// // // // ─── Text Extraction ──────────────────────────────────────────────────────────

// // // /**
// // //  * Extract text from a PDF buffer.
// // //  */
// // // const extractTextFromPDF = async (buffer) => {
// // //     try {
// // //         const data = await pdf(buffer);
// // //         return data.text;
// // //     } catch (error) {
// // //         console.error('Error extracting PDF text:', error);
// // //         throw new Error('Failed to extract text from PDF');
// // //     }
// // // };

// // // /**
// // //  * Extract text from an image buffer using Tesseract OCR.
// // //  * Supports JPEG, PNG, WEBP, BMP, TIFF.
// // //  */
// // // const extractTextFromImage = async (buffer) => {
// // //     try {
// // //         const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
// // //             logger: () => { }, // suppress verbose logs
// // //         });

// // //         if (!text || text.trim().length < 20) {
// // //             throw new Error(
// // //                 'Could not extract readable text from image. Ensure the resume image is clear and high-resolution.'
// // //             );
// // //         }

// // //         return text;
// // //     } catch (error) {
// // //         console.error('Error extracting image text:', error);
// // //         throw new Error(error.message || 'Failed to extract text from image');
// // //     }
// // // };

// // // /**
// // //  * Auto-detect file type and extract text accordingly.
// // //  * @param {Buffer} buffer    - File buffer
// // //  * @param {string} mimetype  - MIME type of the uploaded file
// // //  */
// // // const extractTextFromFile = async (buffer, mimetype) => {
// // //     if (mimetype === 'application/pdf') {
// // //         return extractTextFromPDF(buffer);
// // //     }

// // //     if (SUPPORTED_IMAGE_TYPES.includes(mimetype)) {
// // //         return extractTextFromImage(buffer);
// // //     }

// // //     throw new Error(
// // //         `Unsupported file type: ${mimetype}. Please upload a PDF or image (JPG, PNG, WEBP, BMP, TIFF).`
// // //     );
// // // };

// // // // ─── Keyword Extraction ───────────────────────────────────────────────────────
// // // const extractKeywords = (text) => {
// // //     if (!text) return [];
// // //     const tokens = tokenizer.tokenize(text.toLowerCase());
// // //     const filtered = stopword.removeStopwords(tokens);
// // //     const stemmed = filtered.map((word) => PorterStemmer.stem(word));
// // //     return [...new Set(stemmed)];
// // // };

// // // // ─── Noise words that should NEVER be treated as skills ──────────────────────
// // // // These are generic English words that appear in JDs but have no skill value.
// // // const SKILL_NOISE_WORDS = new Set([
// // //     // Generic adjectives / adverbs
// // //     'strong', 'basic', 'good', 'great', 'excellent', 'solid', 'deep', 'broad',
// // //     'general', 'advanced', 'intermediate', 'junior', 'senior', 'lead', 'ideal',
// // //     'passionate', 'motivated', 'driven', 'eager', 'quick', 'fast', 'clear',
// // //     'proven', 'demonstrated', 'exceptional', 'outstanding', 'relevant', 'nice',
// // //     // Generic verbs / gerunds
// // //     'using', 'working', 'building', 'seeking', 'looking', 'learning', 'helping',
// // //     'developing', 'creating', 'managing', 'understanding', 'providing', 'leading',
// // //     'close', 'work', 'build', 'test', 'real', 'world', 'based', 'exposure',
// // //     'tasks', 'role', 'roles', 'apply', 'join', 'grow', 'gain', 'write', 'follow',
// // //     // Generic nouns
// // //     'intern', 'internship', 'fresher', 'candidate', 'applicant', 'individual',
// // //     'team', 'member', 'environment', 'company', 'startup', 'organization', 'firm',
// // //     'experience', 'knowledge', 'background', 'overview', 'position', 'opportunity',
// // //     'science', 'degree', 'field', 'area', 'domain', 'stack', 'focus', 'passion',
// // //     'applications', 'databases', 'systems', 'tools', 'technologies', 'solutions',
// // //     'projects', 'tasks', 'goals', 'results', 'impact', 'value', 'quality',
// // //     // Filler / transition words that escape stopword filters
// // //     'etc', 'including', 'such', 'well', 'also', 'plus', 'bonus', 'preferred',
// // //     'required', 'must', 'will', 'should', 'can', 'able', 'ability', 'skills',
// // //     'with', 'the', 'and','while',
// // //     'seeking', 'wanted', 'hiring', 'open', 'full', 'time', 'part', 'remote',
// // // ]);

// // // const isNoisySkillWord = (term) => {
// // //     if (SKILL_NOISE_WORDS.has(term)) return true;
// // //     // Drop purely numeric or single-char tokens
// // //     if (/^\d+$/.test(term)) return true;
// // //     if (term.length <= 2) return true;
// // //     return false;
// // // };

// // // // ─── Dynamic Skill / Phrase Extraction from any JD ───────────────────────────
// // // const extractDynamicSkills = (text) => {
// // //     if (!text) return [];

// // //     const lower = text.toLowerCase();

// // //     // 1. Single-word important terms via TF-IDF — filtered for noise
// // //     const tfidf = new TfIdf();
// // //     tfidf.addDocument(lower);
// // //     const singleTerms = [];
// // //     tfidf.listTerms(0).forEach(({ term, tfidf: score }) => {
// // //         if (score > 0 && term.length > 2 && !isNoisySkillWord(term)) {
// // //             singleTerms.push(term);
// // //         }
// // //     });

// // //     // 2. Bigrams and trigrams built from non-noisy words only
// // //     const words = (lower.match(/\b[a-z][a-z0-9+#.\-]{1,30}\b/g) || [])
// // //         .filter((w) => !isNoisySkillWord(w));

// // //     const ngrams = [];
// // //     for (let i = 0; i < words.length - 1; i++) {
// // //         ngrams.push(`${words[i]} ${words[i + 1]}`);
// // //         if (i < words.length - 2) {
// // //             ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
// // //         }
// // //     }

// // //     // 3. Filter n-grams to those appearing in requirement-dense lines
// // //     const requirementLines = lower
// // //         .split('\n')
// // //         .filter((line) =>
// // //             /(\brequir|\bresponsib|\bmust\b|\bshould\b|\bpreferr|\bqualif|\bexperi|\bknowledge\b|\bskill|\bability|\bfamiliar|\bproficien)/i.test(line)
// // //         )
// // //         .join(' ');

// // //     const filteredNgrams = ngrams.filter((ng) => requirementLines.includes(ng));

// // //     // 4. Combine and deduplicate — prefer multi-word phrases (more precise)
// // //     const combined = [...new Set([...filteredNgrams, ...singleTerms.slice(0, 40)])];
// // //     return combined;
// // // };

// // // const matchDynamicSkills = (resumeText, jdSkills) => {
// // //     const lowerResume = resumeText.toLowerCase();
// // //     const matched = [];
// // //     const gaps = [];

// // //     jdSkills.forEach((skill) => {
// // //         const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// // //         const regex = new RegExp(`\\b${escaped}\\b`, 'i');
// // //         if (regex.test(lowerResume)) {
// // //             matched.push(skill);
// // //         } else {
// // //             gaps.push(skill);
// // //         }
// // //     });

// // //     return { matched, gaps };
// // // };

// // // // ─── Section Detection ────────────────────────────────────────────────────────
// // // const detectSections = (text) => {
// // //     const results = {};
// // //     Object.keys(SECTIONS_REGEX).forEach((section) => {
// // //         results[section] = SECTIONS_REGEX[section].test(text);
// // //     });
// // //     return results;
// // // };

// // // // ─── Formatting Check ─────────────────────────────────────────────────────────
// // // const checkFormatting = (text) => {
// // //     let score = 100;
// // //     const wordCount = text.trim().split(/\s+/).length;

// // //     if (wordCount < 300 || wordCount > 800) score -= 20;

// // //     const specialChars = text.match(/[^a-zA-Z0-9\s]/g) || [];
// // //     if (specialChars.length / text.length > 0.05) score -= 15;

// // //     const pipes = (text.match(/\|/g) || []).length;
// // //     if (pipes > 5) score -= 15;

// // //     const breaks = (text.match(/\n/g) || []).length;
// // //     if (breaks > 10 && breaks < 100) score += 5;

// // //     return Math.max(0, Math.min(100, score));
// // // };

// // // // ─── Suggestions ──────────────────────────────────────────────────────────────
// // // const generateSuggestions = (result) => {
// // //     const suggestions = [];
// // //     const { subScores, sectionChecklist, missingKeywords, skillGaps } = result;

// // //     if (subScores.keywordMatch < 50) {
// // //         suggestions.push('Tailor your resume more specifically to this role — mirror the exact language from the job description.');
// // //     }
// // //     if (missingKeywords.length > 3) {
// // //         suggestions.push(`Incorporate these missing keywords naturally: ${missingKeywords.slice(0, 5).join(', ')}.`);
// // //     }
// // //     if (!sectionChecklist.Summary) {
// // //         suggestions.push('Add a concise professional summary at the top of your resume.');
// // //     }
// // //     if (!sectionChecklist.Projects) {
// // //         suggestions.push('Add a Projects section to showcase relevant hands-on work.');
// // //     }
// // //     if (!sectionChecklist.Certifications) {
// // //         suggestions.push('Consider adding relevant certifications or courses to strengthen your profile.');
// // //     }
// // //     if (skillGaps.length > 0) {
// // //         suggestions.push(`Address these skill gaps from the job description: ${skillGaps.slice(0, 5).join(', ')}.`);
// // //     }
// // //     if (subScores.formatting < 60) {
// // //         suggestions.push('Keep your resume between 300–800 words and avoid tables, pipes, and excessive special characters.');
// // //     }
// // //     if (subScores.sectionCompleteness < 60) {
// // //         suggestions.push('Ensure your resume has clearly labelled sections: Summary, Experience, Education, Skills, and Projects.');
// // //     }

// // //     return [...new Set(suggestions)];
// // // };

// // // // ─── Build stem → best readable word map ─────────────────────────────────────
// // // const buildStemMap = (text) => {
// // //     if (!text) return {};
// // //     const tokens = tokenizer.tokenize(text.toLowerCase());
// // //     const filtered = stopword.removeStopwords(tokens);
// // //     const map = {};
// // //     filtered.forEach((word) => {
// // //         const stem = PorterStemmer.stem(word);
// // //         // Prefer shorter, more natural-looking surface forms
// // //         if (!map[stem] || word.length < map[stem].length) {
// // //             map[stem] = word;
// // //         }
// // //     });
// // //     return map;
// // // };

// // // // ─── Main Scoring Function ────────────────────────────────────────────────────
// // // const calculateScore = (resumeText, jobDescription) => {
// // //     const resumeKeywords = extractKeywords(resumeText);
// // //     const jdKeywords = extractKeywords(jobDescription);

// // //     // Build stem→word map so we can display readable words instead of stems
// // //     const jdStemMap = buildStemMap(jobDescription);
// // //     const toReadable = (stems) =>
// // //         stems
// // //             .map((s) => jdStemMap[s] || s)
// // //             .filter((w) => !isNoisySkillWord(w) && w.length > 2);

// // //     const matchedKeywordStems = jdKeywords.filter((kw) => resumeKeywords.includes(kw));
// // //     const missingKeywordStems = jdKeywords.filter((kw) => !resumeKeywords.includes(kw));

// // //     const jdSkills = extractDynamicSkills(jobDescription);
// // //     const { matched: matchedSkills, gaps: skillGaps } = matchDynamicSkills(resumeText, jdSkills);

// // //     const sectionChecklist = detectSections(resumeText);
// // //     const formattingScore = checkFormatting(resumeText);

// // //     const keywordMatchScore = jdKeywords.length > 0 ? (matchedKeywordStems.length / jdKeywords.length) * 100 : 100;
// // //     const skillMatchScore = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 100;
// // //     const sectionsCount = Object.values(sectionChecklist).filter(Boolean).length;
// // //     const sectionCompletenessScore = (sectionsCount / Object.keys(sectionChecklist).length) * 100;

// // //     const weightedScore = Math.round(
// // //         keywordMatchScore * 0.35 +
// // //         skillMatchScore * 0.30 +
// // //         sectionCompletenessScore * 0.20 +
// // //         formattingScore * 0.15
// // //     );

// // //     const result = {
// // //         score: weightedScore,
// // //         // Display readable words, not truncated stems like "comput" or "technolog"
// // //         matchedKeywords: toReadable(matchedKeywordStems).slice(0, 10),
// // //         missingKeywords: toReadable(missingKeywordStems).slice(0, 10),
// // //         sectionChecklist,
// // //         skillGaps: skillGaps.slice(0, 15),
// // //         matchedSkills: matchedSkills.slice(0, 15),
// // //         subScores: {
// // //             keywordMatch: Math.round(keywordMatchScore),
// // //             skillMatch: Math.round(skillMatchScore),
// // //             sectionCompleteness: Math.round(sectionCompletenessScore),
// // //             formatting: Math.round(formattingScore),
// // //         },
// // //     };

// // //     result.suggestions = generateSuggestions(result);
// // //     return result;
// // // };

// // // module.exports = {
// // //     extractTextFromFile,
// // //     extractTextFromPDF, // kept for backward compatibility
// // //     calculateScore,
// // //     SUPPORTED_TYPES,
// // //     SUPPORTED_IMAGE_TYPES,
// // // };
// // const pdf = require('pdf-parse');
// // const natural = require('natural');
// // const stopword = require('stopword');
// // const Tesseract = require('tesseract.js');
// // const nlp = require('compromise');

// // const { PorterStemmer, WordTokenizer, TfIdf } = natural;
// // const tokenizer = new WordTokenizer();

// // // ─── Supported MIME Types ─────────────────────────────────────────────────────
// // const SUPPORTED_IMAGE_TYPES = [
// //     'image/jpeg', 'image/jpg', 'image/png',
// //     'image/webp', 'image/bmp', 'image/tiff',
// // ];
// // const SUPPORTED_TYPES = ['application/pdf', ...SUPPORTED_IMAGE_TYPES];

// // // ─── Section Detection ────────────────────────────────────────────────────────
// // const SECTIONS_REGEX = {
// //     Experience: /(experience|work history|employment history|professional experience|background|career history)/i,
// //     Education: /(education|academic background|qualifications|degree|university|college)/i,
// //     Skills: /(skills|technical skills|competencies|expertise|proficiencies|abilities)/i,
// //     Summary: /(summary|objective|professional profile|about me|overview|profile)/i,
// //     Certifications: /(certifications|licenses|awards|courses|accreditations|credentials)/i,
// //     Projects: /(projects|personal projects|portfolio|academic projects|case studies|work samples)/i,
// // };

// // // ─── Text Extraction ──────────────────────────────────────────────────────────
// // const extractTextFromPDF = async (buffer) => {
// //     try {
// //         const data = await pdf(buffer);
// //         return data.text;
// //     } catch (error) {
// //         throw new Error('Failed to extract text from PDF');
// //     }
// // };

// // const extractTextFromImage = async (buffer) => {
// //     try {
// //         const { data: { text } } = await Tesseract.recognize(buffer, 'eng', { logger: () => { } });
// //         if (!text || text.trim().length < 20) {
// //             throw new Error('Could not extract readable text from image. Ensure the image is clear and high-resolution.');
// //         }
// //         return text;
// //     } catch (error) {
// //         throw new Error(error.message || 'Failed to extract text from image');
// //     }
// // };

// // const extractTextFromFile = async (buffer, mimetype) => {
// //     if (mimetype === 'application/pdf') return extractTextFromPDF(buffer);
// //     if (SUPPORTED_IMAGE_TYPES.includes(mimetype)) return extractTextFromImage(buffer);
// //     throw new Error(`Unsupported file type: ${mimetype}.`);
// // };

// // // ─── POS-Based Keyword Extraction ────────────────────────────────────────────
// // // Uses compromise NLP to extract ONLY nouns and noun phrases.
// // // This automatically eliminates adjectives (simple, practical, strong),
// // // verbs (enjoy, improve, know), and adverbs — keeping only real skill words.
// // const extractNounKeywords = (text) => {
// //     if (!text) return [];

// //     const doc = nlp(text);

// //     // Extract single nouns (proper + common)
// //     const nouns = doc.nouns().out('array');

// //     // Extract multi-word noun phrases (e.g. "software development", "machine learning")
// //     const nounPhrases = doc.match('#Noun+ #Noun').out('array');

// //     // Also grab terms tagged as organisations or acronyms (catches things like "REST", "API", "HTML")
// //     const acronyms = doc.acronyms().out('array');
// //     const organisations = doc.organizations().out('array');
// //     const topics = doc.topics().out('array');

// //     const combined = [...nouns, ...nounPhrases, ...acronyms, ...organisations, ...topics]
// //         .map((w) => w.toLowerCase().trim())
// //         .filter((w) => w.length > 2 && !/^\d+$/.test(w));

// //     return [...new Set(combined)];
// // };

// // // ─── Stemmed Keyword Extraction (for scoring overlap) ────────────────────────
// // // Still use stems internally for matching accuracy, but only from noun keywords.
// // const extractKeywords = (text) => {
// //     if (!text) return [];

// //     // Only stem words that are nouns — not all words
// //     const nounWords = extractNounKeywords(text);
// //     const stemmed = nounWords.map((word) => PorterStemmer.stem(word));
// //     return [...new Set(stemmed)];
// // };

// // // ─── Dynamic Skill Extraction ─────────────────────────────────────────────────
// // // Extracts concrete skill phrases from the JD using:
// // // 1. NLP noun phrases (multi-word skills like "python programming")
// // // 2. TF-IDF noun terms (important single-word skills)
// // // 3. Verbatim existence check — no false adjacency
// // const extractDynamicSkills = (text) => {
// //     if (!text) return [];

// //     const lower = text.toLowerCase();
// //     const doc = nlp(text);

// //     // Multi-word noun phrases that appear verbatim
// //     const nounPhrases = doc.match('#Noun+ #Noun').out('array')
// //         .map((p) => p.toLowerCase().trim())
// //         .filter((p) => p.length > 3 && lower.includes(p));

// //     // Compound noun patterns common in tech/professional JDs
// //     const compoundPatterns = doc.match('(#Adjective|#Noun) #Noun+').out('array')
// //         .map((p) => p.toLowerCase().trim())
// //         .filter((p) => p.split(' ').length >= 2 && lower.includes(p));

// //     // Single high-value noun terms via TF-IDF
// //     const tfidf = new TfIdf();
// //     tfidf.addDocument(lower);
// //     const nounSet = new Set(extractNounKeywords(text));
// //     const singleTerms = [];
// //     tfidf.listTerms(0).forEach(({ term, tfidf: score }) => {
// //         if (score > 0 && term.length > 2 && nounSet.has(term)) {
// //             singleTerms.push(term);
// //         }
// //     });

// //     // Combine: phrases first (more specific), then single noun terms
// //     const combined = [...new Set([...nounPhrases, ...compoundPatterns, ...singleTerms.slice(0, 30)])];
// //     return combined;
// // };

// // // ─── Match Skills Against Resume ──────────────────────────────────────────────
// // const matchDynamicSkills = (resumeText, jdSkills) => {
// //     const lowerResume = resumeText.toLowerCase();
// //     const matched = [];
// //     const gaps = [];

// //     jdSkills.forEach((skill) => {
// //         const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// //         const regex = new RegExp(`\\b${escaped}\\b`, 'i');
// //         if (regex.test(lowerResume)) {
// //             matched.push(skill);
// //         } else {
// //             gaps.push(skill);
// //         }
// //     });

// //     return { matched, gaps };
// // };

// // // ─── Section Detection ────────────────────────────────────────────────────────
// // const detectSections = (text) => {
// //     const results = {};
// //     Object.keys(SECTIONS_REGEX).forEach((section) => {
// //         results[section] = SECTIONS_REGEX[section].test(text);
// //     });
// //     return results;
// // };

// // // ─── Formatting Check ─────────────────────────────────────────────────────────
// // const checkFormatting = (text) => {
// //     let score = 100;
// //     const wordCount = text.trim().split(/\s+/).length;
// //     if (wordCount < 300 || wordCount > 800) score -= 20;

// //     const specialChars = text.match(/[^a-zA-Z0-9\s]/g) || [];
// //     if (specialChars.length / text.length > 0.05) score -= 15;

// //     const pipes = (text.match(/\|/g) || []).length;
// //     if (pipes > 5) score -= 15;

// //     const breaks = (text.match(/\n/g) || []).length;
// //     if (breaks > 10 && breaks < 100) score += 5;

// //     return Math.max(0, Math.min(100, score));
// // };

// // // ─── Suggestions ──────────────────────────────────────────────────────────────
// // const generateSuggestions = (result) => {
// //     const suggestions = [];
// //     const { subScores, sectionChecklist, missingKeywords, skillGaps } = result;

// //     if (subScores.keywordMatch < 50) {
// //         suggestions.push('Tailor your resume more specifically to this role — mirror the exact language from the job description.');
// //     }
// //     if (missingKeywords.length > 3) {
// //         suggestions.push(`Incorporate these missing keywords naturally: ${missingKeywords.slice(0, 5).join(', ')}.`);
// //     }
// //     if (!sectionChecklist.Summary) {
// //         suggestions.push('Add a concise professional summary at the top of your resume.');
// //     }
// //     if (!sectionChecklist.Projects) {
// //         suggestions.push('Add a Projects section to showcase relevant hands-on work.');
// //     }
// //     if (!sectionChecklist.Certifications) {
// //         suggestions.push('Consider adding relevant certifications or courses to strengthen your profile.');
// //     }
// //     if (skillGaps.length > 0) {
// //         suggestions.push(`Address these skill gaps from the job description: ${skillGaps.slice(0, 5).join(', ')}.`);
// //     }
// //     if (subScores.formatting < 60) {
// //         suggestions.push('Keep your resume between 300–800 words and avoid tables, pipes, and excessive special characters.');
// //     }
// //     if (subScores.sectionCompleteness < 60) {
// //         suggestions.push('Ensure your resume has clearly labelled sections: Summary, Experience, Education, Skills, and Projects.');
// //     }

// //     return [...new Set(suggestions)];
// // };

// // // ─── Main Scoring Function ────────────────────────────────────────────────────
// // const calculateScore = (resumeText, jobDescription) => {
// //     const resumeKeywords = extractKeywords(resumeText);
// //     const jdKeywords = extractKeywords(jobDescription);

// //     // Display the actual noun words (not stems) in the UI
// //     const jdNounWords = extractNounKeywords(jobDescription);
// //     const resumeNounWords = new Set(extractNounKeywords(resumeText));

// //     const matchedKeywordStems = jdKeywords.filter((kw) => resumeKeywords.includes(kw));
// //     const missingKeywordStems = jdKeywords.filter((kw) => !resumeKeywords.includes(kw));

// //     // Convert stems back to readable noun words for display
// //     const stemToWord = {};
// //     jdNounWords.forEach((word) => {
// //         stemToWord[PorterStemmer.stem(word)] = word;
// //     });
// //     const toReadable = (stems) =>
// //         stems.map((s) => stemToWord[s] || s).filter((w) => w.length > 2);

// //     const jdSkills = extractDynamicSkills(jobDescription);
// //     const { matched: matchedSkills, gaps: skillGaps } = matchDynamicSkills(resumeText, jdSkills);

// //     const sectionChecklist = detectSections(resumeText);
// //     const formattingScore = checkFormatting(resumeText);

// //     const keywordMatchScore = jdKeywords.length > 0
// //         ? (matchedKeywordStems.length / jdKeywords.length) * 100 : 100;
// //     const skillMatchScore = jdSkills.length > 0
// //         ? (matchedSkills.length / jdSkills.length) * 100 : 100;
// //     const sectionsCount = Object.values(sectionChecklist).filter(Boolean).length;
// //     const sectionCompletenessScore = (sectionsCount / Object.keys(sectionChecklist).length) * 100;

// //     const weightedScore = Math.round(
// //         keywordMatchScore * 0.35 +
// //         skillMatchScore * 0.30 +
// //         sectionCompletenessScore * 0.20 +
// //         formattingScore * 0.15
// //     );

// //     const result = {
// //         score: weightedScore,
// //         matchedKeywords: toReadable(matchedKeywordStems).slice(0, 12),
// //         missingKeywords: toReadable(missingKeywordStems).slice(0, 12),
// //         sectionChecklist,
// //         skillGaps: skillGaps.slice(0, 15),
// //         matchedSkills: matchedSkills.slice(0, 15),
// //         subScores: {
// //             keywordMatch: Math.round(keywordMatchScore),
// //             skillMatch: Math.round(skillMatchScore),
// //             sectionCompleteness: Math.round(sectionCompletenessScore),
// //             formatting: Math.round(formattingScore),
// //         },
// //     };

// //     result.suggestions = generateSuggestions(result);
// //     return result;
// // };

// // module.exports = {
// //     extractTextFromFile,
// //     extractTextFromPDF,
// //     calculateScore,
// //     SUPPORTED_TYPES,
// //     SUPPORTED_IMAGE_TYPES,
// // };

// const pdf = require('pdf-parse');
// const natural = require('natural');
// const stopword = require('stopword');
// const Tesseract = require('tesseract.js');

// const { PorterStemmer, WordTokenizer, TfIdf } = natural;
// const tokenizer = new WordTokenizer();

// // ─── Supported MIME Types ─────────────────────────────────────────────────────
// const SUPPORTED_IMAGE_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','image/bmp','image/tiff'];
// const SUPPORTED_TYPES = ['application/pdf', ...SUPPORTED_IMAGE_TYPES];

// // ─── Section Detection ────────────────────────────────────────────────────────
// const SECTIONS_REGEX = {
//     Experience: /(experience|work history|employment history|professional experience|background|career history)/i,
//     Education: /(education|academic background|qualifications|degree|university|college)/i,
//     Skills: /(skills|technical skills|competencies|expertise|proficiencies|abilities)/i,
//     Summary: /(summary|objective|professional profile|about me|overview|profile)/i,
//     Certifications: /(certifications|licenses|awards|courses|accreditations|credentials)/i,
//     Projects: /(projects|personal projects|portfolio|academic projects|case studies|work samples)/i,
// };

// // ─── Text Extraction ──────────────────────────────────────────────────────────
// const extractTextFromPDF = async (buffer) => {
//     try {
//         const data = await pdf(buffer);
//         return data.text;
//     } catch (error) {
//         throw new Error('Failed to extract text from PDF');
//     }
// };

// const extractTextFromImage = async (buffer) => {
//     try {
//         const { data: { text } } = await Tesseract.recognize(buffer, 'eng', { logger: () => {} });
//         if (!text || text.trim().length < 20) throw new Error('Could not extract readable text from image.');
//         return text;
//     } catch (error) {
//         throw new Error(error.message || 'Failed to extract text from image');
//     }
// };

// const extractTextFromFile = async (buffer, mimetype) => {
//     if (mimetype === 'application/pdf') return extractTextFromPDF(buffer);
//     if (SUPPORTED_IMAGE_TYPES.includes(mimetype)) return extractTextFromImage(buffer);
//     throw new Error(`Unsupported file type: ${mimetype}.`);
// };

// // ─── Strict Noise Filter ──────────────────────────────────────────────────────
// // A word/phrase is noise if it:
// //   - starts with a pronoun/article/possessive (my, a, an, the, our, your, his, her)
// //   - contains punctuation other than hyphens, dots, +, #
// //   - is a known generic/hollow word
// //   - is shorter than 3 chars
// const PRONOUNS_ARTICLES = new Set([
//     'a','an','the','my','your','our','their','his','her','its','this','that',
//     'these','those','some','any','all','both','each','no','every',
// ]);

// const GENERIC_WORDS = new Set([
//     // vague adjectives
//     'strong','basic','good','great','excellent','solid','deep','broad','general',
//     'advanced','intermediate','junior','senior','ideal','passionate','motivated',
//     'driven','eager','quick','fast','clear','proven','demonstrated','exceptional',
//     'outstanding','relevant','practical','simple','entry','level','real','world',
//     // vague verbs / gerunds
//     'using','working','building','seeking','looking','learning','helping','enjoy',
//     'developing','creating','managing','understanding','providing','leading','know',
//     'apply','join','grow','gain','write','follow','improve','store','handle',
//     'support','assist','ensure','maintain','perform','implement','utilize',
//     'collaborate','communicate','interested','interest','passion','familiar',
//     // vague nouns
//     'student','fresher','candidate','applicant','individual','person','people',
//     'team','member','environment','company','startup','organization','firm',
//     'experience','knowledge','background','overview','position','opportunity',
//     'degree','field','area','domain','focus','goal','goals','result','results',
//     'impact','value','quality','problem','problems','solution','solutions',
//     'application','applications','project','projects','task','tasks','skill',
//     'skills','ability','abilities','tool','tools','technology','technologies',
//     'language','languages','framework','frameworks','concept','concepts',
//     // filler / transition
//     'including','such','well','also','plus','bonus','preferred','required',
//     'must','will','should','can','able','wanted','hiring','open','remote',
//     'full','time','part','etc','coding','abilities','opportunity','interest',
// ]);

// /**
//  * Returns true if a phrase should be rejected as noise.
//  * Applied to both keywords and skills.
//  */
// const isNoise = (phrase) => {
//     if (!phrase) return true;
//     const p = phrase.trim().toLowerCase();

//     // Too short
//     if (p.length <= 2) return true;

//     // Contains punctuation other than - . + # / (e.g. commas, quotes, parens)
//     if (/[,;:'"()[\]{}!?@$%^&*=<>]/.test(p)) return true;

//     // Starts with a pronoun, article, or possessive (catches "my skills", "a student", "an opportunity")
//     const firstWord = p.split(/\s+/)[0];
//     if (PRONOUNS_ARTICLES.has(firstWord)) return true;

//     // Single word that's in the generic blocklist
//     if (!p.includes(' ') && GENERIC_WORDS.has(p)) return true;

//     // Purely numeric
//     if (/^\d+$/.test(p)) return true;

//     // Ends with a possessive ('s)
//     if (p.endsWith("'s") || p.endsWith("s'")) return true;

//     return false;
// };

// // ─── Keyword Extraction (stemmed, noun-only) ──────────────────────────────────
// // Extracts meaningful single words only — stopword filtered + noise filtered + stemmed
// const extractKeywords = (text) => {
//     if (!text) return [];
//     const tokens = tokenizer.tokenize(text.toLowerCase());
//     const filtered = stopword.removeStopwords(tokens)
//         .filter((w) => w.length > 2 && !isNoise(w) && !GENERIC_WORDS.has(w));
//     const stemmed = filtered.map((w) => PorterStemmer.stem(w));
//     return [...new Set(stemmed)];
// };

// // Stem → best surface word map for readable display
// const buildStemMap = (text) => {
//     if (!text) return {};
//     const tokens = tokenizer.tokenize(text.toLowerCase());
//     const filtered = stopword.removeStopwords(tokens)
//         .filter((w) => !isNoise(w) && !GENERIC_WORDS.has(w));
//     const map = {};
//     filtered.forEach((word) => {
//         const stem = PorterStemmer.stem(word);
//         if (!map[stem] || word.length < map[stem].length) map[stem] = word;
//     });
//     return map;
// };

// // ─── Skill Extraction ─────────────────────────────────────────────────────────
// // Extracts ONLY clean, concrete skill tokens from the JD.
// // Strategy:
// //   1. Find clean 1-3 word phrases using strict regex patterns (no pronouns, no punctuation)
// //   2. Validate each phrase actually appears verbatim in the JD
// //   3. Score by TF-IDF to surface the most important ones
// //   4. Apply noise filter to remove anything hollow
// const extractDynamicSkills = (text) => {
//     if (!text) return [];
//     const lower = text.toLowerCase();

//     // Pattern: a skill token is 1–3 words where:
//     //   - each word is alphanumeric (allows hyphens, +, #, .)
//     //   - no word is a pronoun/article/possessive
//     //   - no commas or other punctuation
//     // We scan every possible 1, 2, and 3-word window from the text.
//     const wordTokens = lower.match(/\b[a-z][a-z0-9+#.\-]*\b/g) || [];

//     const candidates = new Set();

//     for (let i = 0; i < wordTokens.length; i++) {
//         const w1 = wordTokens[i];
//         if (isNoise(w1) || GENERIC_WORDS.has(w1) || PRONOUNS_ARTICLES.has(w1)) continue;
//         if (w1.length < 3) continue;

//         // Single word candidate
//         candidates.add(w1);

//         if (i + 1 < wordTokens.length) {
//             const w2 = wordTokens[i + 1];
//             if (!isNoise(w2) && !PRONOUNS_ARTICLES.has(w2) && w2.length >= 2) {
//                 const bigram = `${w1} ${w2}`;
//                 // Must exist verbatim in original text
//                 if (lower.includes(bigram)) candidates.add(bigram);

//                 if (i + 2 < wordTokens.length) {
//                     const w3 = wordTokens[i + 2];
//                     if (!isNoise(w3) && !PRONOUNS_ARTICLES.has(w3) && w3.length >= 2) {
//                         const trigram = `${w1} ${w2} ${w3}`;
//                         if (lower.includes(trigram)) candidates.add(trigram);
//                     }
//                 }
//             }
//         }
//     }

//     // Score candidates by TF-IDF and apply final noise filter
//     const tfidf = new TfIdf();
//     tfidf.addDocument(lower);

//     const scored = [];
//     candidates.forEach((phrase) => {
//         if (isNoise(phrase)) return;
//         // For multi-word, score by first word's TF-IDF
//         const firstWord = phrase.split(' ')[0];
//         let score = 0;
//         tfidf.listTerms(0).forEach(({ term, tfidf: s }) => {
//             if (term === firstWord) score = s;
//         });
//         // Boost multi-word phrases — they are more specific
//         if (phrase.includes(' ')) score *= 1.5;
//         scored.push({ phrase, score });
//     });

//     // Sort by score, return top 30 most relevant
//     return scored
//         .sort((a, b) => b.score - a.score)
//         .map((s) => s.phrase)
//         .slice(0, 30);
// };

// // ─── Match Skills ─────────────────────────────────────────────────────────────
// const matchDynamicSkills = (resumeText, jdSkills) => {
//     const lowerResume = resumeText.toLowerCase();
//     const matched = [];
//     const gaps = [];
//     jdSkills.forEach((skill) => {
//         const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         if (new RegExp(`\\b${escaped}\\b`, 'i').test(lowerResume)) {
//             matched.push(skill);
//         } else {
//             gaps.push(skill);
//         }
//     });
//     return { matched, gaps };
// };

// // ─── Section Detection ────────────────────────────────────────────────────────
// const detectSections = (text) => {
//     const results = {};
//     Object.keys(SECTIONS_REGEX).forEach((s) => { results[s] = SECTIONS_REGEX[s].test(text); });
//     return results;
// };

// // ─── Formatting Check ─────────────────────────────────────────────────────────
// const checkFormatting = (text) => {
//     let score = 100;
//     const wordCount = text.trim().split(/\s+/).length;
//     if (wordCount < 300 || wordCount > 800) score -= 20;
//     const specialChars = text.match(/[^a-zA-Z0-9\s]/g) || [];
//     if (specialChars.length / text.length > 0.05) score -= 15;
//     if ((text.match(/\|/g) || []).length > 5) score -= 15;
//     const breaks = (text.match(/\n/g) || []).length;
//     if (breaks > 10 && breaks < 100) score += 5;
//     return Math.max(0, Math.min(100, score));
// };

// // ─── Suggestions ──────────────────────────────────────────────────────────────
// const generateSuggestions = (result) => {
//     const suggestions = [];
//     const { subScores, sectionChecklist, missingKeywords, skillGaps } = result;
//     if (subScores.keywordMatch < 50)
//         suggestions.push('Tailor your resume more specifically to this role — mirror the exact language from the job description.');
//     if (missingKeywords.length > 3)
//         suggestions.push(`Incorporate these missing keywords naturally: ${missingKeywords.slice(0, 5).join(', ')}.`);
//     if (!sectionChecklist.Summary)
//         suggestions.push('Add a concise professional summary at the top of your resume.');
//     if (!sectionChecklist.Projects)
//         suggestions.push('Add a Projects section to showcase relevant hands-on work.');
//     if (!sectionChecklist.Certifications)
//         suggestions.push('Consider adding relevant certifications or courses to strengthen your profile.');
//     if (skillGaps.length > 0)
//         suggestions.push(`Address these skill gaps from the job description: ${skillGaps.slice(0, 5).join(', ')}.`);
//     if (subScores.formatting < 60)
//         suggestions.push('Keep your resume between 300–800 words and avoid tables, pipes, and excessive special characters.');
//     if (subScores.sectionCompleteness < 60)
//         suggestions.push('Ensure your resume has clearly labelled sections: Summary, Experience, Education, Skills, and Projects.');
//     return [...new Set(suggestions)];
// };

// // ─── Main Scoring ─────────────────────────────────────────────────────────────
// const calculateScore = (resumeText, jobDescription) => {
//     const resumeKeywords = extractKeywords(resumeText);
//     const jdKeywords = extractKeywords(jobDescription);
//     const stemMap = buildStemMap(jobDescription);

//     const toReadable = (stems) =>
//         stems.map((s) => stemMap[s] || s).filter((w) => !isNoise(w) && w.length > 2);

//     const matchedStems = jdKeywords.filter((kw) => resumeKeywords.includes(kw));
//     const missingStems = jdKeywords.filter((kw) => !resumeKeywords.includes(kw));

//     const jdSkills = extractDynamicSkills(jobDescription);
//     const { matched: matchedSkills, gaps: skillGaps } = matchDynamicSkills(resumeText, jdSkills);

//     const sectionChecklist = detectSections(resumeText);
//     const formattingScore = checkFormatting(resumeText);

//     const keywordMatchScore = jdKeywords.length > 0 ? (matchedStems.length / jdKeywords.length) * 100 : 100;
//     const skillMatchScore = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 100;
//     const sectionsCount = Object.values(sectionChecklist).filter(Boolean).length;
//     const sectionCompletenessScore = (sectionsCount / Object.keys(sectionChecklist).length) * 100;

//     const weightedScore = Math.round(
//         keywordMatchScore * 0.35 +
//         skillMatchScore * 0.30 +
//         sectionCompletenessScore * 0.20 +
//         formattingScore * 0.15
//     );

//     const result = {
//         score: weightedScore,
//         matchedKeywords: toReadable(matchedStems).slice(0, 12),
//         missingKeywords: toReadable(missingStems).slice(0, 12),
//         sectionChecklist,
//         skillGaps: skillGaps.slice(0, 15),
//         matchedSkills: matchedSkills.slice(0, 15),
//         subScores: {
//             keywordMatch: Math.round(keywordMatchScore),
//             skillMatch: Math.round(skillMatchScore),
//             sectionCompleteness: Math.round(sectionCompletenessScore),
//             formatting: Math.round(formattingScore),
//         },
//     };

//     result.suggestions = generateSuggestions(result);
//     return result;
// };

// module.exports = {
//     extractTextFromFile,
//     extractTextFromPDF,
//     calculateScore,
//     SUPPORTED_TYPES,
//     SUPPORTED_IMAGE_TYPES,
// };
const pdf = require('pdf-parse');
const natural = require('natural');
const stopword = require('stopword');
const Tesseract = require('tesseract.js');

const { PorterStemmer, WordTokenizer, TfIdf } = natural;
const tokenizer = new WordTokenizer();

// ─── Supported MIME Types ─────────────────────────────────────────────────────
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
const SUPPORTED_TYPES = ['application/pdf', ...SUPPORTED_IMAGE_TYPES];

// ─── Section Detection ────────────────────────────────────────────────────────
const SECTIONS_REGEX = {
    Experience: /(experience|work history|employment history|professional experience|background|career history)/i,
    Education: /(education|academic background|qualifications|degree|university|college)/i,
    Skills: /(skills|technical skills|competencies|expertise|proficiencies|abilities|tools)/i,
    Summary: /(summary|objective|professional profile|about me|overview|profile)/i,
    Certifications: /(certifications|licenses|awards|courses|accreditations|credentials)/i,
    Projects: /(projects|personal projects|portfolio|academic projects|case studies|work samples|gallery|showreel)/i,
};

// ─── Portfolio & Contact Detection ───────────────────────────────────────────
const PORTFOLIO_REGEX = /(behance\.net|dribbble\.com|github\.com|portfolio|linkedin\.com\/in|instagram\.com|youtube\.com|vimeo\.com|artstation\.com|personal website|linktr\.ee)/i;

// ─── Text Extraction ──────────────────────────────────────────────────────────
const extractTextFromPDF = async (buffer) => {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        throw new Error('Failed to extract text from PDF');
    }
};

const extractTextFromImage = async (buffer) => {
    try {
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng', { logger: () => { } });
        if (!text || text.trim().length < 20) throw new Error('Could not extract readable text from image.');
        return text;
    } catch (error) {
        throw new Error(error.message || 'Failed to extract text from image');
    }
};

const extractTextFromFile = async (buffer, mimetype) => {
    if (mimetype === 'application/pdf') return extractTextFromPDF(buffer);
    if (SUPPORTED_IMAGE_TYPES.includes(mimetype)) return extractTextFromImage(buffer);
    throw new Error(`Unsupported file type: ${mimetype}.`);
};

// ─── Strict Noise Filter ──────────────────────────────────────────────────────
const PRONOUNS_ARTICLES = new Set([
    'a', 'an', 'the', 'my', 'your', 'our', 'their', 'his', 'her', 'its', 'this', 'that',
    'these', 'those', 'some', 'any', 'all', 'both', 'each', 'no', 'every',
]);

const GENERIC_WORDS = new Set([
    // vague adjectives
    'strong', 'basic', 'good', 'great', 'excellent', 'solid', 'deep', 'broad', 'general',
    'advanced', 'intermediate', 'junior', 'senior', 'ideal', 'passionate', 'motivated',
    'driven', 'eager', 'quick', 'fast', 'clear', 'proven', 'demonstrated', 'exceptional',
    'outstanding', 'relevant', 'practical', 'simple', 'entry', 'level', 'real', 'world',
    // vague verbs / gerunds
    'using', 'working', 'building', 'seeking', 'looking', 'learning', 'helping', 'enjoy',
    'developing', 'creating', 'managing', 'understanding', 'providing', 'leading', 'know',
    'apply', 'join', 'grow', 'gain', 'write', 'follow', 'improve', 'store', 'handle',
    'support', 'assist', 'ensure', 'maintain', 'perform', 'implement', 'utilize',
    'collaborate', 'communicate', 'interested', 'interest', 'passion', 'familiar',
    // vague nouns
    'student', 'fresher', 'candidate', 'applicant', 'individual', 'person', 'people',
    'team', 'member', 'environment', 'company', 'startup', 'organization', 'firm',
    'experience', 'knowledge', 'background', 'overview', 'position', 'opportunity',
    'degree', 'field', 'area', 'domain', 'focus', 'goal', 'goals', 'result', 'results',
    'impact', 'value', 'quality', 'problem', 'problems', 'solution', 'solutions',
    'application', 'applications', 'project', 'projects', 'task', 'tasks', 'skill',
    'skills', 'ability', 'abilities', 'tool', 'tools', 'technology', 'technologies',
    'language', 'languages', 'framework', 'frameworks', 'concept', 'concepts',
    // filler / transition
    'including', 'such', 'well', 'also', 'plus', 'bonus', 'preferred', 'required',
    'must', 'will', 'should', 'can', 'able', 'wanted', 'hiring', 'open', 'remote',
    'full', 'time', 'part', 'etc', 'coding', 'abilities', 'opportunity', 'interest',
]);

// Creative specific words that should skip the noise filter
const CREATIVE_EXCEPTIONS = new Set([
    'seo', 'sem', 'ppc', 'crm', 'ui', 'ux', 'ai', 'pr', 'hr', 'ads', 'vfx', 'cgi', '3d', '2d',
    'logo', 'brand', 'copy', 'blog', 'social', 'media', 'video', 'photo', 'web', 'dev', 'app',
    'email', 'content', 'growth', 'digital', 'search', 'engine', 'marketing', 'design', 'layout'
]);

const ACTION_VERBS = new Set([
    'accelerated', 'achieved', 'analyzed', 'authored', 'budgeted', 'calculated', 'centralized',
    'clarified', 'collaborated', 'composed', 'constructed', 'converted', 'created', 'debugged',
    'delivered', 'designed', 'detected', 'developed', 'devised', 'directed', 'distributed',
    'documented', 'drafted', 'edited', 'eliminated', 'enabled', 'engineered', 'enhanced',
    'established', 'executed', 'expanded', 'expedited', 'fabricated', 'facilitated', 'finalized',
    'formulated', 'generated', 'guided', 'handled', 'identified', 'implemented', 'improved',
    'increased', 'initiated', 'inspected', 'installed', 'integrated', 'invented', 'launched',
    'led', 'localized', 'managed', 'marketed', 'maximized', 'mediated', 'mentored', 'minimized',
    'mobilized', 'modeled', 'monitored', 'motivated', 'negotiated', 'optimized', 'organized',
    'originated', 'overhauled', 'oversaw', 'performed', 'pioneered', 'planned', 'polished',
    'predicted', 'prioritized', 'processed', 'produced', 'programmed', 'projected', 'promoted',
    'published', 'purchased', 'recorded', 'recruited', 'redesigned', 'reduced', 'refined',
    'regulated', 'rehabilitated', 'remodeled', 'reorganized', 'repaired', 'replaced', 'reported',
    'represented', 'researched', 'resolved', 'restored', 'restructured', 'retrieved', 'reviewed',
    'revitalized', 'scheduled', 'scanned', 'selected', 'serviced', 'simplified', 'simulated',
    'sketched', 'solved', 'spearheaded', 'specialized', 'standardized', 'stimulated', 'strategized',
    'streamlined', 'strengthened', 'structured', 'studied', 'supervised', 'supported', 'surveyed',
    'synthesized', 'tabulated', 'taught', 'trained', 'transformed', 'translated', 'upgraded',
    'validated', 'visualized', 'wrote'
]);

const SOFT_SKILLS = new Set([
    'leadership', 'communication', 'teamwork', 'problem-solving', 'critical thinking',
    'adaptability', 'flexibility', 'time management', 'work ethic', 'conflict resolution',
    'emotional intelligence', 'creativity', 'mentoring', 'collaboration', 'presentation',
    'public speaking', 'negotiation', 'networking', 'patience', 'empathy', 'integrity'
]);


/**
 * Returns true if a phrase should be rejected as noise.
 */
const isNoise = (phrase) => {
    if (!phrase) return true;
    const p = phrase.trim().toLowerCase();

    // Creative exceptions allow shorter terms like "seo", "ui", "ux", "hr"
    if (CREATIVE_EXCEPTIONS.has(p)) return false;

    // Too short
    if (p.length <= 2) return true;

    // Contains punctuation other than - . + # /
    if (/[,;:'"()[\]{}!?@$%^&*=<>]/.test(p)) return true;

    // Starts with a pronoun, article, or possessive
    const firstWord = p.split(/\s+/)[0];
    if (PRONOUNS_ARTICLES.has(firstWord)) return true;

    // Single word that's in the generic blocklist
    if (!p.includes(' ') && GENERIC_WORDS.has(p)) return true;

    // Purely numeric
    if (/^\d+$/.test(p)) return true;

    return false;
};

// ─── Keyword Extraction ───────────────────────────────────────────────────────
const extractKeywords = (text) => {
    if (!text) return [];
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const filtered = stopword.removeStopwords(tokens)
        .filter((w) => {
            if (CREATIVE_EXCEPTIONS.has(w)) return true;
            return w.length > 2 && !isNoise(w) && !GENERIC_WORDS.has(w);
        });
    const stemmed = filtered.map((w) => PorterStemmer.stem(w));
    return [...new Set(stemmed)];
};

const buildStemMap = (text) => {
    if (!text) return {};
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const filtered = stopword.removeStopwords(tokens)
        .filter((w) => {
            if (CREATIVE_EXCEPTIONS.has(w)) return true;
            return !isNoise(w) && !GENERIC_WORDS.has(w);
        });
    const map = {};
    filtered.forEach((word) => {
        const stem = PorterStemmer.stem(word);
        if (!map[stem] || word.length < map[stem].length) map[stem] = word;
    });
    return map;
};

// ─── Skill Extraction ─────────────────────────────────────────────────────────
const extractDynamicSkills = (text) => {
    if (!text) return [];
    const lower = text.toLowerCase();

    // Scan every possible 1, 2, and 3-word window
    const wordTokens = lower.match(/\b[a-z][a-z0-9+#.\-]*\b/g) || [];
    const candidates = new Set();

    for (let i = 0; i < wordTokens.length; i++) {
        const w1 = wordTokens[i];
        if (!CREATIVE_EXCEPTIONS.has(w1)) {
            if (isNoise(w1) || GENERIC_WORDS.has(w1) || PRONOUNS_ARTICLES.has(w1)) continue;
        }

        candidates.add(w1);

        if (i + 1 < wordTokens.length) {
            const w2 = wordTokens[i + 1];
            if (CREATIVE_EXCEPTIONS.has(w2) || (!isNoise(w2) && !PRONOUNS_ARTICLES.has(w2))) {
                const bigram = `${w1} ${w2}`;
                if (lower.includes(bigram)) candidates.add(bigram);

                if (i + 2 < wordTokens.length) {
                    const w3 = wordTokens[i + 2];
                    if (CREATIVE_EXCEPTIONS.has(w3) || (!isNoise(w3) && !PRONOUNS_ARTICLES.has(w3))) {
                        const trigram = `${w1} ${w2} ${w3}`;
                        if (lower.includes(trigram)) candidates.add(trigram);
                    }
                }
            }
        }
    }

    const tfidf = new TfIdf();
    tfidf.addDocument(lower);

    const scored = [];
    candidates.forEach((phrase) => {
        if (isNoise(phrase) && !CREATIVE_EXCEPTIONS.has(phrase)) return;
        const firstWord = phrase.split(' ')[0];
        let score = 0;
        tfidf.listTerms(0).forEach(({ term, tfidf: s }) => {
            if (term === firstWord) score = s;
        });
        if (phrase.includes(' ')) score *= 1.5;
        // Boost creative terms
        if (phrase.split(' ').some(w => CREATIVE_EXCEPTIONS.has(w))) score *= 1.2;
        scored.push({ phrase, score });
    });

    return scored
        .sort((a, b) => b.score - a.score)
        .map((s) => s.phrase)
        .slice(0, 40);
};

// ─── Match Skills ─────────────────────────────────────────────────────────────
const matchDynamicSkills = (resumeText, jdSkills) => {
    const lowerResume = resumeText.toLowerCase();
    const matched = [];
    const gaps = [];
    jdSkills.forEach((skill) => {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}\\b`, 'i').test(lowerResume)) {
            matched.push(skill);
        } else {
            gaps.push(skill);
        }
    });
    return { matched, gaps };
};

// ─── Section Detection ────────────────────────────────────────────────────────
const detectSections = (text) => {
    const results = {};
    Object.keys(SECTIONS_REGEX).forEach((s) => { results[s] = SECTIONS_REGEX[s].test(text); });
    return results;
};

// ─── Formatting Check ─────────────────────────────────────────────────────────
const checkFormatting = (text) => {
    let score = 100;
    const wordCount = text.trim().split(/\s+/).length;
    // For creative roles, resumes can be shorter or more portfolio-focused
    if (wordCount < 150) score -= 20;
    if (wordCount > 1000) score -= 15;

    const specialChars = text.match(/[^a-zA-Z0-9\s]/g) || [];
    // Creatives use more symbols (social icons, separators)
    if (specialChars.length / text.length > 0.08) score -= 10;

    if ((text.match(/\|/g) || []).length > 15) score -= 10;

    const breaks = (text.match(/\n/g) || []).length;
    if (breaks > 5) score += 5;

    return Math.max(0, Math.min(100, score));
};

// ─── Suggestions ──────────────────────────────────────────────────────────────
const generateSuggestions = (result) => {
    const suggestions = [];
    const { subScores, sectionChecklist, missingKeywords, skillGaps, hasPortfolio } = result;

    if (subScores.keywordMatch < 50)
        suggestions.push('Tailor your resume more specifically by mirroring the exact creative tools and skills mentioned.');

    if (missingKeywords.length > 3)
        suggestions.push(`Try to include these missing terms: ${missingKeywords.slice(0, 5).join(', ')}.`);

    if (!sectionChecklist.Summary)
        suggestions.push('Add a short professional bio or summary that highlights your creative USP.');

    if (!sectionChecklist.Projects && !hasPortfolio)
        suggestions.push('Crucial: Add a Portfolio link or Projects section to showcase your work.');

    if (skillGaps.length > 0)
        suggestions.push(`Addressing these core requirements could boost your match: ${skillGaps.slice(0, 5).join(', ')}.`);

    if (subScores.formatting < 60)
        suggestions.push('Ensure your layout is clean and readable by ATS; avoid highly complex multi-column tables.');

    if (!hasPortfolio) {
        suggestions.push('Pro-tip: Adding links to Behance, Dribbble, or a personal gallery is highly recommended for this role.');
    }

    if (result.actionVerbCount < 5) {
        suggestions.push('Use more powerful action verbs (e.g., Spearheaded, Optimized, Orchestrated) to describe your impact.');
    }

    if (!result.contactInfo.email || !result.contactInfo.phone) {
        suggestions.push('Make sure both your email and phone number are clearly visible on your resume.');
    }

    return [...new Set(suggestions)];
};

const detectContactInfo = (text) => {
    const email = (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || [])[0] || null;
    const phone = (text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) || [])[0] || null;
    return { email, phone };
};

const analyzeActionVerbs = (text) => {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const found = tokens.filter(t => ACTION_VERBS.has(t));
    return {
        count: found.length,
        verbs: [...new Set(found)].slice(0, 10)
    };
};

const analyzeSoftSkills = (resumeText, jdText) => {
    const lowerResume = resumeText.toLowerCase();
    const lowerJd = jdText.toLowerCase();

    const matched = [];
    const missing = [];

    SOFT_SKILLS.forEach(skill => {
        const inJd = lowerJd.includes(skill);
        const inResume = lowerResume.includes(skill);

        if (inJd && inResume) matched.push(skill);
        else if (inJd && !inResume) missing.push(skill);
    });

    return { matched, missing };
};

// ─── Experience & Internship Detection ───────────────────────────────────────
const extractExperienceYears = (text) => {
    const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
    return yearsMatch ? parseInt(yearsMatch[1]) : 0;
};

const extractInternships = (text) => {
    const internships = [];
    // Look for "Intern" followed by some words (likely company name)
    const regex = /(?:intern(?:ship)?)\s+(?:at|with|in)?\s*([A-Z][a-zA-Z0-9&.\s]{2,30})(?=\s|\n|$)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (!GENERIC_WORDS.has(match[1].toLowerCase().trim())) {
            internships.push(match[1].trim());
        }
    }
    return [...new Set(internships)];
};

// ─── Main Scoring ─────────────────────────────────────────────────────────────
const calculateScore = (resumeText, jobDescription) => {
    const resumeKeywords = extractKeywords(resumeText);
    const jdKeywords = extractKeywords(jobDescription);
    const stemMap = buildStemMap(jobDescription);

    const toReadable = (stems) =>
        stems.map((s) => stemMap[s] || s).filter((w) => !isNoise(w) && w.length > 2);

    const matchedStems = jdKeywords.filter((kw) => resumeKeywords.includes(kw));
    const missingStems = jdKeywords.filter((kw) => !resumeKeywords.includes(kw));

    const jdSkills = extractDynamicSkills(jobDescription);
    const { matched: matchedSkills, gaps: skillGaps } = matchDynamicSkills(resumeText, jdSkills);

    const sectionChecklist = detectSections(resumeText);
    const formattingScore = checkFormatting(resumeText);

    // Portfolio Check
    const hasPortfolio = PORTFOLIO_REGEX.test(resumeText);

    // New: Experience & Internship Check
    const expYears = extractExperienceYears(resumeText);
    const internships = extractInternships(resumeText);
    const contactInfo = detectContactInfo(resumeText);
    const actionVerbs = analyzeActionVerbs(resumeText);
    const softSkills = analyzeSoftSkills(resumeText, jobDescription);

    // Smarter weighting: If JD is very short (< 30 words), it's likely a keyword list.
    const isKeywordCompare = jobDescription.trim().split(/\s+/).length < 30;

    const keywordMatchScore = jdKeywords.length > 0 ? (matchedStems.length / jdKeywords.length) * 100 : 100;
    const skillMatchScore = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 100;
    const sectionsCount = Object.values(sectionChecklist).filter(Boolean).length;
    let sectionCompletenessScore = (sectionsCount / Object.keys(sectionChecklist).length) * 100;

    // Portfolio Bonus
    if (hasPortfolio) {
        sectionCompletenessScore = Math.min(100, sectionCompletenessScore + 10);
    }

    // Experience Bonus
    if (expYears > 0) {
        sectionCompletenessScore = Math.min(100, sectionCompletenessScore + 5);
    }

    // Contact Info Bonus
    if (contactInfo.email && contactInfo.phone) {
        sectionCompletenessScore = Math.min(100, sectionCompletenessScore + 5);
    }

    let weights = {
        keyword: 0.35,
        skill: 0.30,
        section: 0.20,
        formatting: 0.15
    };

    if (isKeywordCompare) {
        // High focus on direct matching
        weights = { keyword: 0.50, skill: 0.40, section: 0.05, formatting: 0.05 };
    }

    const weightedScore = Math.round(
        keywordMatchScore * weights.keyword +
        skillMatchScore * weights.skill +
        sectionCompletenessScore * weights.section +
        formattingScore * weights.formatting
    );

    const result = {
        score: weightedScore,
        matchedKeywords: toReadable(matchedStems).slice(0, 15),
        missingKeywords: toReadable(missingStems).slice(0, 15),
        sectionChecklist,
        skillGaps: skillGaps.slice(0, 15),
        matchedSkills: matchedSkills.slice(0, 15),
        hasPortfolio,
        experienceYears: expYears,
        internships: internships,
        contactInfo,
        actionVerbCount: actionVerbs.count,
        topActionVerbs: actionVerbs.verbs,
        softSkillsMatch: softSkills.matched,
        softSkillsMissing: softSkills.missing,
        subScores: {
            keywordMatch: Math.round(keywordMatchScore),
            skillMatch: Math.round(skillMatchScore),
            sectionCompleteness: Math.round(sectionCompletenessScore),
            formatting: Math.round(formattingScore),
        },
    };

    result.suggestions = generateSuggestions(result);
    return result;
};

module.exports = {
    extractTextFromFile,
    extractTextFromPDF,
    calculateScore,
    SUPPORTED_TYPES,
    SUPPORTED_IMAGE_TYPES,
};

module.exports = {
    extractTextFromFile,
    extractTextFromPDF,
    calculateScore,
    SUPPORTED_TYPES,
    SUPPORTED_IMAGE_TYPES,
};