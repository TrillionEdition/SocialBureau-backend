const AtsScan = require('../models/AtsScan');
const Resume = require('../models/Resume');
const { extractTextFromPDF, calculateScore, extractResumeData } = require('../utils/atsEngine');
const { extractResumeDataAI } = require('../utils/resumeParserAI');

// Analyze resume — jobDescription is optional
const analyzeResume = async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        const jobDescription = req.body.jobDescription || '';

        if (!clientId) {
            return res.status(400).json({ message: 'x-client-id header is required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Resume PDF is required' });
        }

        const resumeText = await extractTextFromPDF(req.file.buffer);
        const result = calculateScore(resumeText, jobDescription, req.file.size);

        const newScan = new AtsScan({
            clientId,
            fileName: req.file.originalname,
            score: result.score,
            result: result
        });

        await newScan.save();

        res.json(result);
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ message: error.message || 'Error processing resume' });
    }
};

// Generate a fresh ATS-friendly resume — JD optional (enhances output if provided)
const generateResume = async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        if (!clientId) {
            // we really need a clientid to store resumes against a user
            return res.status(400).json({ message: 'x-client-id header is required for saving resumes' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Resume PDF is required' });
        }

        const jobDescription = req.body.jobDescription || '';
        const resumeText = await extractTextFromPDF(req.file.buffer);

        let data = {};
        try {
            // Attempt AI structuring if key is present
            data = await extractResumeDataAI(resumeText);
        } catch (e) {
            // Fallback to our improved heuristic parser if no API key or AI fails
            data = extractResumeData(resumeText);
        }

        // If JD provided, compute missing skills so the modal can show them
        let suggestedSkills = [];
        let jdRole = '';
        if (jobDescription && jobDescription.trim().length > 20) {
            const analysis = calculateScore(resumeText, jobDescription, req.file.size);
            // Combine skill gaps + missing keywords for suggestions
            const allMissing = [
                ...(analysis.skillGaps || []),
                ...(analysis.requiredSkillGaps || []),
                ...(analysis.preferredSkillGaps || []),
            ];
            // Deduplicate and clean
            suggestedSkills = [...new Set(allMissing)].slice(0, 20);

            // Try to extract the role title from the JD (first line or first sentence)
            const firstLine = jobDescription.split('\n').find(l => l.trim().length > 3 && l.trim().length < 80);
            if (firstLine) jdRole = firstLine.trim();
        }

        // Store structured data directly to MongoDB for dashboard editing
        const savedResume = await Resume.create({
            userId: clientId,
            personalInfo: data.personalInfo || {},
            summary: data.summary || '',
            skills: data.skills || [],
            softSkills: data.softSkills || [],
            experience: data.experience || [],
            projects: data.projects || [],
            education: data.education || [],
            certifications: data.certifications || [],
            languages: data.languages || []
        });

        res.json({ ...data, suggestedSkills, jdRole, resumeId: savedResume._id });
    } catch (error) {
        console.error('Resume generation error:', error);
        res.status(500).json({ message: error.message || 'Error generating resume' });
    }
};

// Get a saved resume by ID for editing
const getResume = async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        const { id } = req.params;

        if (!clientId) {
            return res.status(400).json({ message: 'x-client-id header is required' });
        }

        const resume = await Resume.findOne({ _id: id, userId: clientId });
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        res.json(resume);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching resume' });
    }
};

// Update an existing resume (used by React Dashboard when user edits)
const updateResume = async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        const { id } = req.params;
        const updates = req.body;

        if (!clientId) {
            return res.status(400).json({ message: 'x-client-id header is required' });
        }

        const resume = await Resume.findOneAndUpdate(
            { _id: id, userId: clientId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        res.json(resume);
    } catch (error) {
        res.status(500).json({ message: 'Error updating resume' });
    }
};

// Get ATS scan history
const getHistory = async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        if (!clientId) {
            return res.status(400).json({ message: 'x-client-id header is required' });
        }

        const scans = await AtsScan.find({ clientId })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('_id fileName score createdAt');

        res.json(scans);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history' });
    }
};

// Delete scan from history
const deleteHistory = async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        const { id } = req.params;

        if (!clientId) {
            return res.status(400).json({ message: 'x-client-id header is required' });
        }

        const result = await AtsScan.findOneAndDelete({ _id: id, clientId });

        if (!result) {
            return res.status(404).json({ message: 'Scan not found or unauthorized' });
        }

        res.json({ message: 'Scan deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting scan' });
    }
};

module.exports = {
    analyzeResume,
    generateResume,
    getResume,
    updateResume,
    getHistory,
    deleteHistory
};
