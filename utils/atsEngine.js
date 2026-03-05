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

const extractSectionText = (text, sectionName) => {
    const lines = text.split('\n');
    let startIdx = -1;
    const regex = SECTIONS_REGEX[sectionName];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (regex.test(line) && line.length < 50) {
            startIdx = i;
            break;
        }
    }

    if (startIdx === -1) return '';

    const content = [];
    const otherRegexes = Object.entries(SECTIONS_REGEX)
        .filter(([name]) => name !== sectionName)
        .map(([_, r]) => r);

    for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (otherRegexes.some(r => r.test(line) && line.length < 50)) break;
        content.push(line);
    }

    return content.join('\n');
};

const TERMINOLOGY_MAP = {
    'developer': ['dev', 'engineer', 'programmer', 'software engineer', 'sde', 'swe'],
    'designer': ['ui', 'ux', 'graphic', 'visual', 'creative', 'illustrator'],
    'manager': ['lead', 'head', 'director', 'pm', 'coordinator', 'supervisor'],
    'analyst': ['data', 'business', 'research', 'intelligence'],
    'marketing': ['seo', 'sem', 'digital', 'ads', 'content', 'growth'],
    'writer': ['copywriter', 'content', 'editor', 'author'],
    'support': ['customer', 'qa', 'quality', 'testing', 'help']
};

const EDU_HIERARCHY = {
    'phd': 5,
    'doctor': 5,
    'master': 4,
    'mba': 4,
    'ms': 4,
    'msc': 4,
    'bachelor': 3,
    'bs': 3,
    'bsc': 3,
    'btech': 3,
    'be': 3,
    'diploma': 2,
    'associate': 2,
    'high school': 1,
    'none': 0
};

const extractJDRole = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    // Heuristic: The first non-empty line of a JD usually contains the job title
    for (const line of lines) {
        const t = line.trim();
        if (t.length > 3 && t.length < 100 &&
            !/full job description|about the role|description|job summary/i.test(t)) {
            return t;
        }
    }
    return '';
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

const PRONOUNS_ARTICLES = new Set([
    'a', 'an', 'the', 'my', 'your', 'our', 'their', 'his', 'her', 'its', 'this', 'that',
    'these', 'those', 'some', 'any', 'all', 'both', 'each', 'no', 'every', 'has', 'have', 'had'
]);

const GENERIC_WORDS = new Set([
    // Porter stems of common generic words
    'work', 'experi', 'develop', 'technolog', 'manag', 'organ', 'challeng', 'solut', 'environ',
    'knowledg', 'opportun', 'individu', 'success', 'strong', 'excel', 'creat', 'build', 'profici',
    'requir', 'prefer', 'includ', 'provid', 'look', 'seek', 'appli', 'posit', 'team', 'member',
    'basi', 'skill', 'abil', 'high', 'low', 'fast', 'quick', 'solid', 'proven', 'demonstr',
    // Vague adjectives
    'strong', 'basic', 'good', 'great', 'excellent', 'solid', 'deep', 'broad', 'general',
    'advanced', 'intermediate', 'junior', 'senior', 'ideal', 'passionate', 'motivated',
    'driven', 'eager', 'quick', 'fast', 'clear', 'proven', 'demonstrated', 'exceptional',
    'outstanding', 'relevant', 'practical', 'simple', 'entry', 'level', 'real', 'world',
    // Vague verbs / gerunds that appear in JD sentences but are NOT skills
    'using', 'working', 'building', 'seeking', 'looking', 'learning', 'helping', 'enjoy',
    'developing', 'creating', 'managing', 'understanding', 'providing', 'leading', 'know',
    'apply', 'join', 'grow', 'gain', 'write', 'follow', 'improve', 'store', 'handle',
    'support', 'assist', 'ensure', 'maintain', 'perform', 'implement', 'utilize',
    'collaborate', 'communicate', 'interested', 'interest', 'passion', 'familiar',
    'responsible', 'integrating', 'maintaining', 'developing', 'experienced',
    'building', 'implementing', 'managing', 'handling', 'integrat', 'conduct',
    'execute', 'monitor', 'analyze', 'track', 'optimize', 'plan', 'create',
    'design', 'identify', 'define', 'deliver', 'resolve', 'drive', 'support',
    'collaborate', 'coordinate', 'review', 'prepare', 'present', 'report',
    // Vague nouns — too generic to be a skill
    'student', 'fresher', 'candidate', 'applicant', 'individual', 'person', 'people',
    'team', 'member', 'environment', 'company', 'startup', 'organization', 'firm',
    'experience', 'knowledge', 'background', 'overview', 'position', 'opportunity',
    'degree', 'field', 'area', 'domain', 'focus', 'goal', 'goals', 'result', 'results',
    'impact', 'value', 'quality', 'problem', 'problems', 'solution', 'solutions',
    'application', 'applications', 'project', 'projects', 'task', 'tasks', 'skill',
    'skills', 'ability', 'abilities', 'tool', 'tools', 'technology', 'technologies',
    'language', 'languages', 'framework', 'frameworks', 'concept', 'concepts',
    // Noisy single words from screenshots
    'stack', 'developer', 'hands', 'computer', 'science', 'information', 'designation',
    'bachelor', 'intern', 'role', 'profile', 'resume', 'job', 'post', 'salary', 'pay',
    'month', 'year', 'years', 'location', 'type', 'remote', 'hybrid', 'onsite',
    'front', 'backend', 'end', 'full', 'base', 'based', 'non', 'relational',
    'current', 'latest', 'previous', 'upcoming', 'new', 'existing', 'multiple',
    'various', 'different', 'similar', 'related', 'specific', 'certain',
    'data', 'system', 'service', 'services', 'platform', 'platforms', 'cloud',
    'server', 'database', 'databases', 'network', 'interface', 'information',
    'module', 'component', 'feature', 'function', 'functionality', 'process',
    'testing', 'debugging', 'deployment', 'integration', 'implementation',
    // Filler / transition words
    'including', 'such', 'well', 'also', 'plus', 'bonus', 'preferred', 'required',
    'must', 'will', 'should', 'can', 'able', 'wanted', 'hiring', 'open', 'remote',
    'etc', 'coding', 'abilities', 'opportunity', 'interest', 'following', 'good',
    'minimum', 'least', 'hands-on', 'real-world', 'day-to-day', 'key', 'major',
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

const SOFT_SKILLS_MAP = {
    'leadership': ['leadership', 'management', 'steering', 'guiding', 'mentoring', 'team lead'],
    'communication': ['communication', 'verbal', 'written', 'presentation', 'public speaking', 'interpersonal'],
    'teamwork': ['teamwork', 'collaboration', 'team player', 'collaborative', 'cooperation', 'partnership'],
    'problem-solving': ['problem-solving', 'analytical', 'troubleshooting', 'critical thinking', 'decision making'],
    'adaptability': ['adaptability', 'flexibility', 'agile', 'resilient', 'dynamic'],
    'time management': ['time management', 'scheduling', 'prioritization', 'deadline', 'punctuality'],
    'creativity': ['creativity', 'innovative', 'originality', 'visionary', 'imagination'],
    'negotiation': ['negotiation', 'persuasion', 'conflict resolution', 'diplomacy'],
    'empathy': ['empathy', 'emotional intelligence', 'compassion', 'patient'],
    'integrity': ['integrity', 'ethic', 'reliability', 'accountability', 'trustworthy']
};

const SOFT_SKILLS = new Set(Object.keys(SOFT_SKILLS_MAP));

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


// ─── KNOWN SKILLS DICTIONARY (seed list) ──────────────────────────────────────
// A comprehensive curated list of real professional tools, platforms, skills and
// acronyms. When these appear verbatim in the JD they are guaranteed ATS terms.
// This is the primary signal — no TF-IDF needed for these.
const KNOWN_SKILLS = [
    // ── Digital Marketing ──────────────────────────────────────────────────────
    'meta ads', 'google ads', 'facebook ads', 'instagram ads', 'linkedin ads',
    'youtube ads', 'twitter ads', 'tiktok ads', 'pinterest ads', 'snapchat ads',
    'google analytics', 'google search console', 'search console', 'google tag manager',
    'google ads manager', 'meta business suite', 'facebook business manager',
    'facebook manager', 'facebook pixel',
    'sem', 'seo', 'ppc', 'cpc', 'ctr', 'cpm', 'roas', 'roi', 'kpi', 'aov',
    'lead generation', 'lead gen', 'demand generation',
    'on-page seo', 'off-page seo', 'technical seo', 'local seo',
    'keyword research', 'backlink building', 'backlinks', 'link building',
    'domain authority', 'page authority', 'organic traffic', 'paid traffic',
    'content marketing', 'content strategy', 'social media marketing',
    'email marketing', 'affiliate marketing', 'influencer marketing',
    'performance marketing', 'growth hacking', 'conversion rate optimization',
    'a/b testing', 'funnel optimization', 'landing page optimization',
    'retargeting', 'remarketing', 'programmatic advertising',
    'google analytics 4', 'ga4', 'universal analytics', 'adobe analytics',
    'semrush', 'ahrefs', 'moz', 'screaming frog', 'ubersuggest',
    'hubspot', 'mailchimp', 'klaviyo', 'constant contact', 'activecampaign',
    'hootsuite', 'buffer', 'sprout social', 'later', 'meta suite',
    'whatsapp business', 'telegram marketing',
    'campaign management', 'ad campaigns', 'paid campaigns',
    'brand awareness', 'brand strategy', 'brand positioning',
    'market research', 'competitor analysis',
    'weekly reports', 'monthly reports', 'performance reports',
    // ── Graphic Design ─────────────────────────────────────────────────────────
    'adobe photoshop', 'photoshop', 'adobe illustrator', 'illustrator',
    'adobe indesign', 'indesign', 'adobe xd', 'adobe after effects', 'after effects',
    'adobe premiere pro', 'premiere pro', 'adobe audition', 'adobe lightroom', 'lightroom',
    'figma', 'sketch', 'invision', 'zeplin', 'framer', 'principle', 'affinity designer',
    'canva', 'procreate', 'coreldraw', 'vectornator',
    'ui design', 'ux design', 'ui/ux', 'user interface', 'user experience',
    'wireframing', 'prototyping', 'mockup', 'user research', 'usability testing',
    'typography', 'branding', 'logo design', 'motion graphics', 'visual design',
    'print design', 'packaging design', 'responsive design', 'web design',
    // ── Video / Film / VFX ─────────────────────────────────────────────────────
    'vfx', 'cgi', '3d animation', '3d modeling', '2d animation', 'motion graphics',
    'video editing', 'video production', 'color grading', 'color correction',
    'final cut pro', 'davinci resolve', 'resolve', 'avid media composer',
    'cinema 4d', 'c4d', 'blender', 'maya', '3ds max', 'houdini', 'nuke', 'fusion',
    'green screen', 'vfx compositing', 'visual effects', 'storyboarding',
    'cinematography', 'digital cinematography', 'camera operation',
    'lighting setup', 'sound design', 'audio editing', 'podcast production',
    // ── Photography ────────────────────────────────────────────────────────────
    'photography', 'portrait photography', 'product photography', 'event photography',
    'commercial photography', 'photo editing', 'photo retouching',
    // ── Social Media ───────────────────────────────────────────────────────────
    'instagram', 'facebook', 'youtube', 'linkedin', 'twitter', 'tiktok',
    'pinterest', 'snapchat', 'reddit', 'quora',
    'social media management', 'social media strategy', 'social media pages',
    'reels', 'shorts', 'youtube shorts', 'instagram reels', 'stories',
    'content creation', 'content calendar', 'hashtag strategy',
    // ── Development ────────────────────────────────────────────────────────────
    'javascript', 'typescript', 'python', 'java', 'php', 'ruby', 'go', 'rust', 'swift',
    'react', 'react.js', 'next.js', 'vue.js', 'angular', 'svelte', 'node.js', 'express.js',
    'html', 'css', 'tailwind css', 'bootstrap', 'sass', 'wordpress', 'shopify',
    'rest api', 'graphql', 'mongodb', 'mysql', 'postgresql', 'firebase', 'supabase',
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'git', 'github',
    'flutter', 'react native', 'android', 'ios', 'xcode',
    // ── Office / Productivity ───────────────────────────────────────────────────
    'microsoft excel', 'excel', 'google sheets', 'google docs', 'google drive',
    'microsoft office', 'powerpoint', 'google slides', 'notion', 'trello', 'asana',
    'jira', 'slack', 'monday.com', 'clickup', 'basecamp', 'zoom', 'microsoft teams',
    // ── HR / Recruitment ────────────────────────────────────────────────────────
    'talent acquisition', 'recruitment', 'sourcing', 'onboarding', 'payroll',
    'hris', 'ats', 'employee engagement', 'performance management', 'hr management',
    // ── Advertising Metrics ─────────────────────────────────────────────────────
    'click-through rate', 'cost per click', 'cost per acquisition', 'cost per lead',
    'return on ad spend', 'conversion rate', 'impression share', 'quality score',
    'ad spend', 'budget management', 'media buying',
    // ── AI / Data ───────────────────────────────────────────────────────────────
    'machine learning', 'artificial intelligence', 'deep learning', 'nlp',
    'data analysis', 'data analytics', 'data visualization', 'tableau', 'power bi',
    'sql', 'excel analytics', 'looker studio', 'google data studio',
    'chatgpt', 'openai', 'midjourney', 'dall-e', 'stable diffusion', 'ai tools',
    // ── General Professional ────────────────────────────────────────────────────
    'project management', 'agile', 'scrum', 'kanban', 'waterfall',
    'communication skills', 'presentation skills', 'analytical skills',
    'team management', 'client management', 'stakeholder management',
    'report writing', 'documentation', 'research', 'analysis',
];

// ─── Keyword Extraction ───────────────────────────────────────────────────────
// Strategy: extract meaningful single-word terms from JD/resume for stem-based
// overlap scoring. Still used as a secondary signal for the subScore display.
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

// ─── Skill Extraction (Hybrid: Known Skills + Structural Phrase Mining) ────────
/**
 * Extracts concrete, matchable skill/tool phrases from any job description.
 *
 * Three-layer approach:
 *  1. KNOWN_SKILLS seed: scan JD for ~250 known tool/platform/metric names verbatim
 *  2. ACRONYM detection: grab uppercase 2-5 char tokens (CPC, CTR, ROAS, API, etc.)
 *  3. STRUCTURAL phrase mining: extract noun phrases from bullet-point lines
 *     (the JD's requirement lines are the richest source of skill terms)
 *
 * All candidates are verified to exist verbatim in the JD.
 * No stemming — we match phrases exactly against the resume too.
 */
const extractDynamicSkills = (text) => {
    if (!text) return [];
    const lower = text.toLowerCase();
    const candidates = new Set();

    // ── Layer 1: Known skills seed (verbatim substring match) ─────────────────
    KNOWN_SKILLS.forEach(skill => {
        // Use word-boundary aware check
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(?:^|[\\s,/(])${escaped}(?=[\\s,/.)!?]|$)`, 'i').test(lower)) {
            candidates.add(skill.toLowerCase());
        }
    });

    // ── Layer 2: Acronyms (2-5 uppercase chars) ───────────────────────────────
    // Catches: CPC, CTR, ROAS, ROI, SEM, SEO, PPC, KPI, CRM, VFX, CGI, etc.
    const upperAcronyms = text.match(/\b[A-Z][A-Z0-9]{1,4}\b/g) || [];
    upperAcronyms.forEach(a => {
        const low = a.toLowerCase();
        if (!isNoise(low) && !GENERIC_WORDS.has(low) && low.length >= 2) {
            candidates.add(low);
        }
    });

    // ── Layer 3: Structural phrase mining from JD bullet/requirement lines ─────
    // Requirement lines are lines that start with bullet symbols or contain
    // requirement indicator words. These are the richest source of tool names.
    const lines = text.split('\n');
    const reqLines = lines.filter(line => {
        const t = line.trim();
        // Bullet point lines
        if (/^[-•●■*▪►✓✗·]\s/.test(t)) return true;
        // Lines with requirement signals
        if (/\b(must|required|essential|experience in|knowledge of|proficient|familiar with|expertise in|skills in|experience with|using|manage|handle|execute|plan|conduct|build|develop|monitor|analyze|track|create|design|implement|optimize|maintain)\b/i.test(t)) return true;
        return false;
    });

    // ── CONNECTIVE WORDS: words that indicate a phrase is a sentence fragment ────
    // If a bigram/trigram has one of these as its connecting word, reject it.
    // e.g. "databases like mongodb", "responsible for integrating", "for integrating with"
    const CONNECTIVE_WORDS = new Set([
        'like', 'for', 'with', 'and', 'or', 'to', 'of', 'in', 'at', 'by', 'via',
        'into', 'from', 'than', 'that', 'which', 'what', 'how', 'when', 'where',
        'through', 'across', 'between', 'within', 'without', 'against', 'along',
        'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off',
        'over', 'under', 'again', 'further', 'while', 'per',
    ]);

    // Returns true if a multi-word phrase is a sentence fragment (contains connective glue word)
    const isPhraseFragment = (words) => {
        // If the phrase starts with a connective/verb-indicator, it's a fragment
        if (CONNECTIVE_WORDS.has(words[0])) return true;
        // If any MIDDLE word is a connective (not last), it's likely a fragment
        // Exception: hyphenated compounds like "on-page" don't come through here
        for (let i = 1; i < words.length - 1; i++) {
            if (CONNECTIVE_WORDS.has(words[i])) return true;
        }
        // If last word is a connective, fragment
        if (words.length > 1 && CONNECTIVE_WORDS.has(words[words.length - 1])) return true;
        return false;
    };

    reqLines.forEach(line => {
        const lline = line.toLowerCase().replace(/^[-•●■*▪►✓✗·]\s*/, '');

        // ONLY mine multi-word phrases from bullet lines.
        // Single words are fully covered by Layer 1 (KNOWN_SKILLS) and Layer 2 (acronyms).
        // Adding singles here is exactly what creates noise like "stack", "developer", "hands".
        const words = lline.match(/\b[a-z0-9][a-z0-9+#.\-/]*\b/g) || [];

        for (let i = 0; i < words.length; i++) {
            const w1 = words[i];
            // Skip if the first word is noisy, generic, or a connective
            if (PRONOUNS_ARTICLES.has(w1) || GENERIC_WORDS.has(w1) || CONNECTIVE_WORDS.has(w1)) continue;
            if (!CREATIVE_EXCEPTIONS.has(w1) && (isNoise(w1) || w1.length < 3)) continue;

            // ── BIGRAMS ONLY (and trigrams) — no single words from Layer 3 ──
            if (i + 1 < words.length) {
                const w2 = words[i + 1];
                // Reject if w2 is a pronoun/article, or if the whole bigram is a fragment
                if (!PRONOUNS_ARTICLES.has(w2) && !isPhraseFragment([w1, w2])) {
                    const bi = `${w1} ${w2}`;
                    if (lower.includes(bi)) candidates.add(bi);

                    if (i + 2 < words.length) {
                        const w3 = words[i + 2];
                        if (!PRONOUNS_ARTICLES.has(w3) && !isPhraseFragment([w1, w2, w3])) {
                            const tri = `${w1} ${w2} ${w3}`;
                            if (lower.includes(tri)) candidates.add(tri);
                        }
                    }
                }
            }
        }
    });

    // ── Final filter + score ───────────────────────────────────────────────────
    // We already know everything in `candidates` exists in the JD text.
    // Now remove obvious noise and score multi-word phrases higher (more specific).
    const result = [];
    candidates.forEach(phrase => {
        const p = phrase.trim();
        if (!p || p.length < 2) return;
        if (isNoise(p) && !CREATIVE_EXCEPTIONS.has(p)) return;
        // Skip bare generic words that slipped through
        if (GENERIC_WORDS.has(p) && !CREATIVE_EXCEPTIONS.has(p)) return;
        result.push(p);
    });

    // Sort: multi-word first (more specific), then by length (longer = more specific)
    result.sort((a, b) => {
        const aWords = a.split(' ').length;
        const bWords = b.split(' ').length;
        if (bWords !== aWords) return bWords - aWords;
        return b.length - a.length;
    });

    return result.slice(0, 50);
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

// ─── Prohibited Symbols & Quality Regex ──────────────────────────────────────
const PROHIBITED_SYMBOLS = /[★✓➤●■▪►✓✗·\*]/g;
const PROFESSIONAL_EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'protonmail.com', 'hotmail.com'];
const FORBIDDEN_PERSONAL_DETAILS = /\b(religion|marital status|married|single|single parent|caste|race|ethnicity|birth date)\b/i;
const DATE_FORMAT_REGEX = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(?:19|20)\d{2}\b/i;

// Checks if terms like "JavaScript", "React" are correctly capitalized
const verifyCapitalization = (text) => {
    const checkMap = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'react': 'React',
        'node.js': 'Node.js',
        'next.js': 'Next.js',
        'postgresql': 'PostgreSQL',
        'mongodb': 'MongoDB',
        'github': 'GitHub',
        'linkedin': 'LinkedIn',
    };

    let faults = 0;
    Object.entries(checkMap).forEach(([lower, correct]) => {
        const regex = new RegExp(`\\b${lower}\\b`, 'g'); // only match exact lowercase
        const matches = text.match(regex) || [];
        faults += matches.length;
    });
    return faults;
};

// ─── Formatting Check (Strict Professional Standards) ──────────────────────────
const checkFormatting = (text, expYears = 0) => {
    let score = 100;
    const lines = text.trim().split('\n');
    const wordCount = text.trim().split(/\s+/).length;

    // 1. Length (400-600 words per page range)
    // Rule: Stay in 400 - 600 words per page range. Juniors 1-2 pages, Seniors 3 pages.
    if (expYears >= 10) {
        // Seniors: 3 pages (1200 - 1800 words)
        if (wordCount < 1000) score -= 15; // Too thin for a senior
        if (wordCount > 1800) score -= 25; // 3+ pages is excessive
    } else {
        // Freshers/Juniors: 1-2 pages (400 - 1200 words)
        if (wordCount < 400) score -= 20;
        if (wordCount > 1200) score -= 20;
    }

    // 2. Prohibited Symbols (ATS prefers bullets or nothing)
    const badSymbols = text.match(PROHIBITED_SYMBOLS) || [];
    if (badSymbols.length > 5) score -= 15;

    // 3. Header Check ("Resume" at top is bad)
    const firstLine = (lines[0] || '').trim().toLowerCase();
    if (firstLine.includes('resume') && firstLine.length < 10) score -= 10;

    // 4. Excessive Formatting Indicators
    const specialChars = text.match(/[^a-zA-Z0-9\s,.!?;:@#%&\-]/g) || [];
    if (specialChars.length / text.length > 0.05) score -= 10;

    // Pipes often indicate columns or tables (penalty if excessive)
    const pipes = (text.match(/\|/g) || []).length;
    if (pipes > 10) score -= 15;

    // 5. Section Heading Consistency (Check if common headings exist)
    const sectionsFound = detectSections(text);
    const essentialSections = ['Experience', 'Education', 'Skills'];
    essentialSections.forEach(s => {
        if (!sectionsFound[s]) score -= 10;
    });

    return Math.max(0, Math.min(100, score));
};

// ─── Content Standards Verification ───────────────────────────────────────────
const verifyProfessionalContent = (text, contactInfo, softSkillsCount = 0) => {
    let score = 100;
    const lower = text.toLowerCase();

    // 1. Contact Completeness (Email, Phone, LinkedIn)
    if (!contactInfo.email) score -= 30; // Increased penalty
    if (!contactInfo.phone) score -= 30; // Increased penalty
    if (!contactInfo.linkedin) score -= 25; // Increased penalty

    // Gmail preference check
    if (contactInfo.email && !contactInfo.email.toLowerCase().endsWith('gmail.com')) {
        score -= 5;
    }

    // 2. Soft Skills Check
    if (softSkillsCount === 0) score -= 15;
    if (softSkillsCount < 3) score -= 15;
    if (softSkillsCount >= 5) score += 5;

    // 3. Prohibited Personal Details
    if (FORBIDDEN_PERSONAL_DETAILS.test(text)) score -= 30;

    // 4. Quantification (numbers or percentages usually indicate impact)
    const numbers = text.match(/\d+(?:%|\s*percent|\s*million|\s*k\b|\s*growth)/gi) || [];
    if (numbers.length < 3) score -= 20; // Increased penalty

    // 5. Date Consistency
    const dateMatches = text.match(DATE_FORMAT_REGEX) || [];
    if (dateMatches.length < 4) score -= 10; // Experience/Education should have 2+ entries each

    // 6. Capitalization Faults
    const capFaults = verifyCapitalization(text);
    if (capFaults > 2) score -= Math.min(20, capFaults * 2);

    return Math.max(0, Math.min(100, score));
};


// ─── Suggestions ──────────────────────────────────────────────────────────────
// ─── Suggestions ──────────────────────────────────────────────────────────────
const generateSuggestions = (result) => {
    const suggestions = [];
    const { subScores, sectionChecklist, missingKeywords, skillGaps, hasPortfolio, contactInfo } = result;

    if (subScores.keywordMatch < 50)
        suggestions.push('Tailor your resume by matching the exact keywords from the job description (e.g. use both full forms like "Amazon Web Services" and abbreviations like "AWS").');

    if (missingKeywords.length > 3)
        suggestions.push(`Include these core terms to improve matching: ${missingKeywords.slice(0, 5).join(', ')}.`);

    if (!sectionChecklist.Summary)
        suggestions.push('Add a brief professional summary (2-4 sentences) that highlights your key skills and years of experience.');

    if (!sectionChecklist.Projects && !hasPortfolio)
        suggestions.push('Add a Projects section or Portfolio link to showcase measurable achievements.');

    if (skillGaps.length > 0)
        suggestions.push(`Boost your score by addressing these core requirements: ${skillGaps.slice(0, 5).join(', ')}.`);

    if (subScores.formatting < 75) {
        suggestions.push('Keep your layout clean: Avoid tables, text boxes, and multiple columns as ATS may ignore them.');
        suggestions.push('Use standard headings like "Work Experience", "Education", and "Skills" for better parsing.');
        suggestions.push('Avoid special characters or icons like ★, ✓, or ➤ which can break ATS parsing.');
    }

    if (result.projectCount === 0 && result.experienceYears === 0) {
        suggestions.push('Quantify your achievements! Use numbers and percentages (e.g., "Improved performance by 20%") to show impact.');
    }

    if (subScores.educationMatch < 100) {
        suggestions.push('Ensure your degree and enrollment status (if applicable) are clearly stated in the Education section.');
    }

    if (!contactInfo.linkedin) {
        suggestions.push('Consider adding a LinkedIn profile link to your contact information.');
    }

    const emailDomain = contactInfo.email ? contactInfo.email.split('@')[1] : '';
    if (emailDomain && !PROFESSIONAL_EMAIL_DOMAINS.includes(emailDomain.toLowerCase())) {
        suggestions.push('Use a professional email address (e.g., Gmail or Outlook) rather than niche or outdated domains.');
    }

    if (result.actionVerbCount < 8) {
        suggestions.push('Start your bullet points with strong action verbs like "Spearheaded", "Optimized", or "Designed".');
    }

    if (subScores.formatting < 90) {
        suggestions.push('Check your dates: Use a consistent format like "Jan 2023 – Mar 2024" and always include both month and year.');
        suggestions.push('Ensure technical terms are capitalized correctly (e.g., "JavaScript", "React", "AWS").');
    }

    if (result.fileSizeInMB > 2) {
        suggestions.push(`Your PDF file size (${result.fileSizeInMB}MB) is quite large. Try to keep it under 2MB for better compatibility.`);
    }

    return [...new Set(suggestions)];
};

const detectContactInfo = (text) => {
    const email = (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || [])[0] || null;
    const phone = (text.match(/(\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/) || [])[0] || null;

    // LinkedIn URL
    const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/i);
    const linkedin = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : null;

    // GitHub URL
    const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/?/i);
    const github = githubMatch ? `https://github.com/${githubMatch[1]}` : null;

    // Portfolio / personal website
    const portfolioMatch = text.match(
        /(?:https?:\/\/(?!(?:linkedin|github|twitter|instagram|facebook|youtube|mailto))[a-z0-9.-]+\.[a-z]{2,}[^\s,|)]*)/i
    );
    const portfolio = portfolioMatch ? portfolioMatch[0] : null;

    return { email, phone, linkedin, github, portfolio };
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
    const lowerJd = (jdText || '').toLowerCase();

    const matched = [];
    const missing = [];

    Object.entries(SOFT_SKILLS_MAP).forEach(([skill, synonyms]) => {
        // If no JD, check what soft skills the resume itself mentions
        if (!lowerJd) {
            const inResume = lowerResume.includes(skill) || synonyms.some(s => lowerResume.includes(s));
            if (inResume) matched.push(skill);
            return;
        }
        const inJd = lowerJd.includes(skill) || synonyms.some(s => lowerJd.includes(s));
        if (!inJd) return;
        const inResume = lowerResume.includes(skill) || synonyms.some(s => lowerResume.includes(s));
        if (inResume) matched.push(skill);
        else missing.push(skill);
    });

    return { matched, missing };
};

// ─── Project Detection ────────---------____
const extractProjectCount = (text) => {
    const lines = text.split('\n');
    let count = 0;

    // Look for common project header patterns
    const projectHeaderPatterns = [
        /^\s*(?:project|case study)\s*#?\d*(?::|\s+)/i,
        /^\d+\.\s+[a-z0-9\s,&]{5,50}$/im, // Numbered lists that look like titles
        /^(?:selected projects|professional projects|academic projects):/i
    ];

    // Find the Projects section index
    const sectionIndex = lines.findIndex(line => SECTIONS_REGEX.Projects.test(line));
    if (sectionIndex === -1) return 0;

    // Scan from projects section onwards until the next section
    const sectionNames = Object.keys(SECTIONS_REGEX);
    for (let i = sectionIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check if we hit a new section
        const isNextSection = sectionNames.some(name =>
            name !== 'Projects' && SECTIONS_REGEX[name].test(line)
        );
        if (isNextSection) break;

        // Check for project markers
        if (projectHeaderPatterns.some(regex => regex.test(line))) {
            count++;
        }
        // Also look for heavy bullet points that might be project titles
        else if (line.startsWith('●') || line.startsWith('■') || (line.startsWith('•') && line.length > 5 && line.length < 60)) {
            // Only count if it's likely a title (no verb at start usually)
            if (!ACTION_VERBS.has(line.split(' ')[1]?.toLowerCase())) {
                count++;
            }
        }
    }

    // Default to at least 1 if we found the section but couldn't parse sub-items
    return Math.max(count, 1);
};

const parseRequirements = (jdText, skills) => {
    const required = [];
    const preferred = [];

    const sentences = jdText.split(/[.!?\n]/);

    skills.forEach(skill => {
        const lowerSkill = skill.toLowerCase();
        const relevantSentences = sentences.filter(s => s.toLowerCase().includes(lowerSkill));

        let isRequired = false;
        relevantSentences.forEach(s => {
            const low = s.toLowerCase();
            if (/\b(must|required|essential|minimum|minimum of|at least|strong knowledge in)\b/i.test(low)) {
                isRequired = true;
            }
        });

        if (isRequired) required.push(skill);
        else preferred.push(skill);
    });

    return { required, preferred };
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
const calculateScore = (resumeText, jobDescription = '', fileSize = 0) => {
    const hasJD = jobDescription && jobDescription.trim().length > 20;
    const lowerResume = resumeText.toLowerCase();

    // 1. Extract Structural Blocks for Contextual Scoring
    const expText = extractSectionText(resumeText, 'Experience');
    const projText = extractSectionText(resumeText, 'Projects');
    const professionalText = (expText + '\n' + projText).toLowerCase();

    // 2. Keyword & Skill Analysis
    const resumeKeywords = extractKeywords(resumeText);
    const jdKeywords = hasJD ? extractKeywords(jobDescription) : [];
    const stemMap = hasJD ? buildStemMap(jobDescription) : {};
    const toReadable = (stems) => stems.map((s) => stemMap[s] || s).filter((w) => !isNoise(w) && w.length > 2);

    const jdSkills = hasJD ? extractDynamicSkills(jobDescription) : [];
    const { matched: matchedSkills, gaps: skillGaps } = hasJD
        ? matchDynamicSkills(resumeText, jdSkills)
        : { matched: [], gaps: [] };

    // Contextual Bonus: Keywords found in Experience/Projects sections get weighted higher
    let matchedKeywordsWithContext = 0;
    const matchedStems = jdKeywords.filter((kw) => {
        if (resumeKeywords.includes(kw)) {
            const original = stemMap[kw] || kw;
            if (professionalText.includes(original.toLowerCase())) {
                matchedKeywordsWithContext += 1.5; // 50% bonus for context
            } else {
                matchedKeywordsWithContext += 1.0;
            }
            return true;
        }
        return false;
    });

    const missingStems = jdKeywords.filter((kw) => !resumeKeywords.includes(kw));

    // 3. Title & Role Relevance with Terminology Mapping
    let jobTitleScore = 100;
    if (hasJD) {
        const rawJdRole = extractJDRole(jobDescription).toLowerCase();
        // Extract candidate's current/recent title (first non-name line in Experience or top)
        const lines = resumeText.split('\n');
        const candidateTitle = (lines[0]?.length < 60 ? lines[0] : (lines[1]?.length < 60 ? lines[1] : '')).toLowerCase();

        let jdRole = rawJdRole;
        // Expand JD role with synonyms if possible
        const roleBase = Object.keys(TERMINOLOGY_MAP).find(key => rawJdRole.includes(key) || TERMINOLOGY_MAP[key].some(syn => rawJdRole.includes(syn)));

        const keywordsInTitle = jdRole.split(/\s+/).filter(w => !isNoise(w) && w.length >= 3);
        let titleMatchCount = 0;

        if (candidateTitle) {
            keywordsInTitle.forEach(kw => {
                if (candidateTitle.includes(kw)) titleMatchCount++;
                // Check synonyms
                for (const [key, synonyms] of Object.entries(TERMINOLOGY_MAP)) {
                    if (kw.includes(key) || synonyms.some(s => kw.includes(s))) {
                        if (candidateTitle.includes(key) || synonyms.some(s => candidateTitle.includes(s))) {
                            titleMatchCount += 0.8; // Partial credit for synonym match
                        }
                    }
                }
            });
        }

        if (jdRole && candidateTitle) {
            jobTitleScore = keywordsInTitle.length > 0 ? Math.min(100, (titleMatchCount / keywordsInTitle.length) * 100) : 100;
        } else {
            jobTitleScore = 40; // Penalty for missing title in resume or JD
        }
    }

    // 4. Education & Status Matching (Hierarchical)
    let educationScore = 100;
    if (hasJD) {
        let requiredLevel = 0;
        if (/\b(ph\.?d|doctorate)\b/i.test(jobDescription)) requiredLevel = 5;
        else if (/\b(master|m\.?s|m\.?tech|mba|post-graduat)\b/i.test(jobDescription)) requiredLevel = 4;
        else if (/\b(bachelor|degree|b\.?s|b\.?tech|graduat)\b/i.test(jobDescription)) requiredLevel = 3;
        else if (/\b(diploma|associate)\b/i.test(jobDescription)) requiredLevel = 2;
        else if (/\b(high school)\b/i.test(jobDescription)) requiredLevel = 1;

        let resumeLevel = 0;
        if (/\b(ph\.?d|doctorate)\b/i.test(resumeText)) resumeLevel = 5;
        else if (/\b(master|m\.?s|m\.?tech|mba|post-graduat)\b/i.test(resumeText)) resumeLevel = 4;
        else if (/\b(bachelor|degree|b\.?s|b\.?tech|graduat)\b/i.test(resumeText)) resumeLevel = 3;
        else if (/\b(diploma|associate)\b/i.test(resumeText)) resumeLevel = 2;
        else if (/\b(high school)\b/i.test(resumeText)) resumeLevel = 1;

        if (resumeLevel < requiredLevel) {
            educationScore -= (requiredLevel - resumeLevel) * 20;
        } else if (resumeLevel > requiredLevel && requiredLevel > 0) {
            educationScore += 10; // Bonus for over-qualification
        }

        const requiresEnrollment = /\b(currently enrolled|pursuing|student|intern)\b/i.test(jobDescription);
        const isEnrolled = /\b(currently enrolled|pursuing|expected graduation|202[5-9])\b/i.test(resumeText);
        if (requiresEnrollment && !isEnrolled) educationScore -= 20;
    }

    // 5. Formatting & Content Standards Quality
    const sectionChecklist = detectSections(resumeText);
    const contactInfo = detectContactInfo(resumeText);
    const expYears = extractExperienceYears(resumeText);
    const softSkills = analyzeSoftSkills(resumeText, jobDescription);
    const formattingScoreRaw = checkFormatting(resumeText, expYears);
    const contentQualityScore = verifyProfessionalContent(resumeText, contactInfo, softSkills.matched.length);

    // Combine layout formatting with content standard quality
    let formattingScore = Math.round((formattingScoreRaw * 0.6) + (contentQualityScore * 0.4));

    // File Size Limit Check (2MB)
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) formattingScore -= 15;

    const actionVerbs = analyzeActionVerbs(resumeText);
    const hasPortfolio = PORTFOLIO_REGEX.test(resumeText);
    const projectCount = extractProjectCount(resumeText);

    const sectionsCount = Object.values(sectionChecklist).filter(Boolean).length;
    let sectionCompletenessScore = (sectionsCount / Object.keys(sectionChecklist).length) * 100;

    // Portfolio/Contact/Exp Bonuses
    if (hasPortfolio) sectionCompletenessScore = Math.min(100, sectionCompletenessScore + 10);
    if (expYears > 0 || extractInternships(resumeText).length > 0) sectionCompletenessScore = Math.min(100, sectionCompletenessScore + 10);
    if (contactInfo.email && contactInfo.phone) sectionCompletenessScore = Math.min(100, sectionCompletenessScore + 5);

    // 6. FINAL WEIGHTING
    const keywordMatchPct = jdKeywords.length > 0 ? (matchedKeywordsWithContext / (jdKeywords.length * 1.5)) * 100 : 100;
    const skillMatchPct = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 100;

    let weightedScore = Math.round(
        keywordMatchPct * 0.30 +
        skillMatchPct * 0.25 +
        sectionCompletenessScore * 0.10 +
        jobTitleScore * 0.15 +
        educationScore * 0.05 +
        formattingScore * 0.15
    );

    // 7. RIGOROUS PENALTIES (Global Deductions)
    // If essential elements are totally missing, we apply direct deductions to the final score
    const internshipCount = extractInternships(resumeText).length;

    // No Projects AND No Portfolio
    if (projectCount === 0 && !hasPortfolio) {
        weightedScore -= 15;
    }

    // No Experience AND No Internships
    if (expYears === 0 && internshipCount === 0) {
        weightedScore -= 20;
    }

    // Critical Contact Info Missing
    if (!contactInfo.email || !contactInfo.phone) {
        weightedScore -= 10;
    }

    // No Certifications (Optional but user requested rigor)
    if (!sectionChecklist.Certifications) {
        weightedScore -= 5;
    }

    // Required vs Preferred gaps
    const { required: requiredGaps, preferred: preferredGaps } = parseRequirements(jobDescription, skillGaps);

    const result = {
        score: Math.max(0, Math.min(100, weightedScore)),
        matchedKeywords: toReadable(matchedStems).slice(0, 15),
        missingKeywords: toReadable(missingStems).slice(0, 15),
        sectionChecklist,
        skillGaps: skillGaps.slice(0, 15),
        requiredSkillGaps: requiredGaps.slice(0, 10),
        preferredSkillGaps: preferredGaps.slice(0, 10),
        matchedSkills: matchedSkills.slice(0, 15),
        hasPortfolio,
        experienceYears: expYears,
        projectCount,
        internships: extractInternships(resumeText),
        contactInfo,
        fileSizeInMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : 0,
        actionVerbCount: actionVerbs.count,
        topActionVerbs: actionVerbs.verbs,
        softSkillsMatch: softSkills.matched,
        softSkillsMissing: softSkills.missing,
        subScores: {
            keywordMatch: Math.round(keywordMatchPct),
            skillMatch: Math.round(skillMatchPct),
            roleAlignment: Math.round(jobTitleScore),
            educationMatch: Math.round(Math.max(0, educationScore)),
            sectionCompleteness: Math.round(sectionCompletenessScore),
            formatting: Math.round(formattingScore),
        },
    };



    result.suggestions = generateSuggestions(result);
    return result;
};


// ─── Resume Data Extractor ────────────────────────────────────────────────────
/**
 * Parses raw resume text into structured sections for the resume generator.
 * Returns: { name, contact, summary, skills, experience, education, projects, certifications }
 */
const extractResumeData = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // ── Contact Info ──────────────────────────────────────────────────────────
    const contact = detectContactInfo(text);

    // ── LinkedIn / Portfolio / GitHub ─────────────────────────────────────────
    const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin:\s*)([^\s,|]+)/i);
    if (linkedinMatch) contact.linkedin = `https://linkedin.com/in/${linkedinMatch[1].replace(/^\//, '')}`;

    const portfolioMatch = text.match(/(?:portfolio|website|behance\.net\/|dribbble\.com\/|github\.com\/)([^\s,|)]+)/i);
    if (portfolioMatch) contact.portfolio = portfolioMatch[0];

    // ── Name ──────────────────────────────────────────────────────────────────
    // Heuristic: the name is likely the first "clean" line before any @, digit, or section keyword
    const SECTION_KEYWORDS = /^(experience|education|skills|summary|objective|profile|projects|certifications|awards|publications|languages|references|internship|work history|professional|about)/i;
    let name = '';
    for (const line of lines.slice(0, 8)) {
        // Skip lines that look like contact info or section headers
        if (line.includes('@') || /\d{6,}/.test(line)) continue;
        if (SECTION_KEYWORDS.test(line)) break;
        if (line.split(' ').length >= 1 && line.length < 60 && /^[A-Z]/.test(line)) {
            name = line;
            break;
        }
    }

    // ── Section Slicing Helper ────────────────────────────────────────────────
    // Make section regex much stricter: it should be the ONLY major word on the line, or very short.
    const SECTION_MAP = {
        summary: /^(summary|objective|professional\s+profile|about\s+me|overview|profile)$/i,
        experience: /^(experience|work\s+history|employment|professional\s+experience|career\s+history)$/i,
        education: /^(education|academic|qualifications|academic\s+background)$/i,
        skills: /^(skills|technical\s+skills|competencies|expertise|proficiencies|abilities)$/i,
        projects: /^(projects|personal\s+projects|portfolio|academic\s+projects|case\s+studies|work\s+samples)$/i,
        certifications: /^(certifications|licenses|awards|courses|accreditations|credentials|achievements)$/i,
        languages: /^(languages|language\s*skills)$/i,
    };

    // Find line indices for each section header
    const sectionIndices = {};
    lines.forEach((line, idx) => {
        // Strip non-alphanumeric chars for header testing, e.g. "EXPERIENCE:" -> "EXPERIENCE"
        const cleanLine = line.replace(/[^\w\s]/g, '').trim();
        for (const [key, regex] of Object.entries(SECTION_MAP)) {
            if (regex.test(cleanLine) && cleanLine.length < 40) {
                if (!(key in sectionIndices)) sectionIndices[key] = idx;
            }
        }
    });

    // Extract lines that belong to a section (until the next known section header)
    const allSectionStarts = Object.values(sectionIndices).sort((a, b) => a - b);

    const getSectionLines = (sectionKey) => {
        const start = sectionIndices[sectionKey];
        if (start === undefined) return [];
        const sortedStarts = allSectionStarts.filter(i => i > start);
        const end = sortedStarts.length > 0 ? sortedStarts[0] : lines.length;
        return lines.slice(start + 1, end).filter(l => l.trim().length > 0);
    };

    // ── Summary ───────────────────────────────────────────────────────────────
    const summaryLines = getSectionLines('summary');
    const summary = summaryLines.join(' ').trim();

    // ── Skills ────────────────────────────────────────────────────────────────
    const skillLines = getSectionLines('skills');
    const rawSkillText = skillLines.join(', ');
    const skills = rawSkillText
        .split(/[,|•·●\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 60);

    // ── Experience Parser ─────────────────────────────────────────────────────
    const expLines = getSectionLines('experience');
    const experience = [];
    const DATE_REGEX = /(\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(?:\d{2,4})?\b)/i;

    let currentExp = null;
    for (const line of expLines) {
        const isBullet = /^[-•●■*▪►✓]/.test(line);
        const hasDates = DATE_REGEX.test(line);
        const isShort = line.length < 120;

        // An entry header is usually short, not a bullet, and either has dates or is clearly a title block.
        // We consider a line a header if it has dates and is short, or if it isn't a bullet and we don't have a current entry.
        if (!isBullet && isShort && hasDates) {
            if (currentExp && (currentExp.title || currentExp.company)) experience.push(currentExp);
            // Attempt to split info. Often it's "Role - Company - Dates" or "Role | Company | Dates"
            const parts = line.split(/(?:\s*[|\-–—,]\s*)+/);
            currentExp = { title: '', company: '', dates: '', bullets: [] };

            // Extract the date part
            const dateMatch = line.match(/(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{2,4}|(?:19|20)\d{2})\s*(?:[-–—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{2,4}|(?:19|20)\d{2}|present|current))?/i);

            if (dateMatch) {
                currentExp.dates = dateMatch[0].trim();
                const remainder = line.replace(dateMatch[0], '').trim().split(/(?:\s*[|\-–—,]\s*)+/).filter(p => p.length > 0);
                currentExp.title = remainder[0] || '';
                currentExp.company = remainder[1] || '';
            } else {
                currentExp.title = parts[0] || line;
                currentExp.company = parts[1] || '';
                currentExp.dates = parts.length > 2 ? parts[parts.length - 1] : '';
            }
        } else if (!isBullet && isShort && currentExp && currentExp.bullets.length === 0 && !currentExp.company) {
            // Continuation of a header (e.g., Company name on next line)
            if (hasDates) currentExp.dates = line;
            else currentExp.company = line;
        } else if (isBullet || line.length > 30) {
            if (!currentExp) currentExp = { title: 'Experience', company: '', dates: '', bullets: [] };
            currentExp.bullets.push(line.replace(/^[-•●■*▪►✓]\s*/, '').trim());
        } else if (!isBullet && isShort && currentExp) {
            // could be a sub-title or another job in the same company
            if (line.trim().length > 3) {
                if (currentExp.bullets.length > 0) {
                    experience.push(currentExp);
                    currentExp = { title: line, company: currentExp.company, dates: '', bullets: [] };
                } else {
                    if (!currentExp.title) currentExp.title = line;
                    else if (!currentExp.company) currentExp.company = line;
                }
            }
        }
    }
    if (currentExp && (currentExp.title || currentExp.bullets.length > 0)) experience.push(currentExp);

    // ── Education Parser ──────────────────────────────────────────────────────
    const eduLines = getSectionLines('education');
    const education = [];
    let currentEdu = null;

    for (const line of eduLines) {
        const hasDates = DATE_REGEX.test(line);
        const isBullet = /^[-•●■*▪►✓]/.test(line);
        const isShort = line.length < 120;
        const hasDegreeKeywords = /\b(bachelor|master|b\.?sc|m\.?sc|b\.?e|m\.?e|mba|phd|diploma|degree|graduate|high school|b\.?tech|m\.?tech)\b/i.test(line);

        if (!isBullet && isShort && (hasDates || hasDegreeKeywords)) {
            if (currentEdu && (currentEdu.degree || currentEdu.school)) education.push(currentEdu);
            const parts = line.split(/(?:\s*[|\-–—,]\s*)+/);
            currentEdu = { degree: '', school: '', dates: '' };

            const dateMatch = line.match(/(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{2,4}|(?:19|20)\d{2})\s*(?:[-–—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{2,4}|(?:19|20)\d{2}|present|current))?/i) || line.match(/\b(?:19|20)\d{2}\b/);

            if (dateMatch) {
                currentEdu.dates = dateMatch[0].trim();
                const remainder = line.replace(dateMatch[0], '').trim().split(/(?:\s*[|\-–—,]\s*)+/).filter(p => p.length > 0);
                currentEdu.degree = remainder[0] || '';
                currentEdu.school = remainder[1] || '';
            } else {
                currentEdu.degree = parts[0] || line;
                currentEdu.school = parts[1] || '';
            }
        } else if (currentEdu && !isBullet && isShort) {
            if (!currentEdu.school && line.length > 3) currentEdu.school = line;
            else if (!currentEdu.dates && hasDates) currentEdu.dates = line;
        } else {
            if (!currentEdu) currentEdu = { degree: line, school: '', dates: '' };
        }
    }
    if (currentEdu && currentEdu.degree) education.push(currentEdu);

    // ── Projects Parser ───────────────────────────────────────────────────────
    const projLines = getSectionLines('projects');
    const projects = [];
    let currentProj = null;
    for (const line of projLines) {
        const isBullet = /^[-•●■*▪►✓]/.test(line);
        const isShort = line.length < 100;

        if (!isBullet && isShort && /^[A-Z0-9]/.test(line)) {
            if (currentProj && (currentProj.name || currentProj.description.length > 0)) projects.push(currentProj);
            currentProj = { name: line.trim(), description: [] };
        } else if (currentProj) {
            if (line.trim().length > 3) {
                currentProj.description.push(line.replace(/^[-•●■*▪►✓]\s*/, '').trim());
            }
        } else if (line.trim().length > 3 && isBullet) {
            currentProj = { name: 'Project', description: [line.replace(/^[-•●■*▪►✓]\s*/, '').trim()] };
        }
    }
    if (currentProj !== null) projects.push(currentProj);

    // ── Certifications & Languages ────────────────────────────────────────────
    const certLines = getSectionLines('certifications');
    const certifications = certLines
        .map(l => l.replace(/^[-•●■*▪►✓]\s*/, '').trim())
        .filter(l => l.length > 2);

    const langLines = getSectionLines('languages');
    const languages = langLines
        .map(l => l.replace(/^[-•●■*▪►✓]\s*/, '').trim())
        .filter(l => l.length > 1);

    return {
        personalInfo: {
            name: name || '',
            email: contact?.email || '',
            phone: contact?.phone || '',
            location: '',
            linkedin: contact?.linkedin || '',
            github: contact?.github || contact?.portfolio || ''
        },
        summary: summary || '',
        skills: skills || [],
        experience: experience.map(exp => {
            // Very naive date splitting if there's a dash for start/end
            let start = exp.dates;
            let end = '';
            if (exp.dates.includes('-') || exp.dates.includes('–') || exp.dates.includes('to')) {
                const p = exp.dates.split(/[-–to]+/);
                start = p[0]?.trim();
                end = p[1]?.trim();
            }
            return {
                jobTitle: exp.title || '',
                company: exp.company || '',
                location: '',
                startDate: start || '',
                endDate: end || '',
                description: exp.bullets || []
            };
        }),
        education: education.map(edu => {
            let start = edu.dates;
            let end = '';
            if (edu.dates.includes('-') || edu.dates.includes('–') || edu.dates.includes('to')) {
                const p = edu.dates.split(/[-–to]+/);
                start = p[0]?.trim();
                end = p[1]?.trim();
            }
            return {
                degree: edu.degree || '',
                institution: edu.school || '',
                location: '',
                startYear: start || '',
                endYear: end || ''
            };
        }),
        projects: projects.map(proj => ({
            title: proj.name || '',
            description: proj.description.join(' ') || '',
            technologies: [],
            github: '',
            liveLink: ''
        })),
        certifications: certifications || [],
        languages: languages || []
    };
};

module.exports = {
    extractTextFromFile,
    extractTextFromPDF,
    calculateScore,
    extractResumeData,
    SUPPORTED_TYPES,
    SUPPORTED_IMAGE_TYPES,
};