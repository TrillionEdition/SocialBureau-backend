const AtsScan = require('../models/AtsScan');
const { extractTextFromPDF, calculateScore } = require('../utils/atsEngine');

// Analyze resume logic
const analyzeResume = async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        const jobDescription = req.body.jobDescription;

        if (!clientId) {
            return res.status(400).json({ message: 'x-client-id header is required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Resume PDF is required' });
        }

        if (!jobDescription || jobDescription.length < 50) {
            return res.status(400).json({ message: 'Job description or keywords must be at least 50 characters' });
        }

        const resumeText = await extractTextFromPDF(req.file.buffer);
        const result = calculateScore(resumeText, jobDescription);

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

// Get ATS scan history logic
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

// Delete scan from history logic
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
    getHistory,
    deleteHistory
};
