const JobApplication = require('../models/JobApplication');
const JobPosting = require('../models/JobPosting');
const User = require('../models/userModel');
const atsEngine = require('../utils/atsEngine');

const jobApplicationController = {
    // APPLY TO JOB
    applyToJob: async (req, res) => {
        const { jobId, candidateName, candidateEmail, coverLetter, userId, relocationInterest } = req.body;
        const resumeFile = req.file;

        try {
            // Check if job exists
            const job = await JobPosting.findById(jobId);
            if (!job) return res.status(404).json({ message: "Job not found" });

            // Check if already applied
            const existing = await JobApplication.findOne({ jobId, userId });
            if (existing) return res.status(400).json({ message: "Already applied" });

            let atsResult = null;
            let resumeUrl = req.body.resumeUrl; // Fallback to URL if no file

            if (resumeFile) {
                // Run ATS analysis
                const resumeText = await atsEngine.extractTextFromFile(resumeFile.buffer, resumeFile.mimetype);
                // We combine all job details for a better JD context
                const roleSummaryStr = (job.roleSummary || []).join(' ');
                const responsibilitiesStr = (job.responsibilities || []).join(' ');
                const fullJd = `${job.title} ${job.company} ${job.description} ${job.about || ''} ${roleSummaryStr} ${responsibilitiesStr}`;
                atsResult = atsEngine.calculateScore(resumeText, fullJd);

                // Note: In a real app, we would upload to Cloudinary/S3 here
                // For now, we'll use a placeholder or the original filename
                resumeUrl = `Upload: ${resumeFile.originalname}`;
            }

            const application = new JobApplication({
                jobId,
                userId,
                candidateName,
                candidateEmail,
                resumeUrl,
                coverLetter,
                relocationInterest: relocationInterest === 'true' || relocationInterest === true,
                atsResult,
                status: 'pending'
            });

            await application.save();
            res.status(201).json(application);
        } catch (error) {
            console.error("Apply Error:", error);
            res.status(500).json({ message: error.message });
        }
    },

    // SAVE JOB
    saveJob: async (req, res) => {
        const { userId, jobId } = req.body;
        try {
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });

            if (user.savedJobs.includes(jobId)) {
                return res.status(400).json({ message: "Already saved" });
            }

            user.savedJobs.push(jobId);
            await user.save();
            res.json({ message: "Job saved", savedJobs: user.savedJobs });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // GET USER APPLICATIONS (APPLIED JOBS)
    getUserApplications: async (req, res) => {
        const { userId } = req.params;
        try {
            const applications = await JobApplication.find({ userId }).populate('jobId');
            res.json(applications);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // GET USER SAVED JOBS
    getSavedJobs: async (req, res) => {
        const { userId } = req.params;
        try {
            const user = await User.findById(userId).populate('savedJobs');
            res.json(user.savedJobs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // GET SINGLE APPLICATION
    getApplication: async (req, res) => {
        const { applicationId } = req.params;
        try {
            const app = await JobApplication.findById(applicationId).populate('jobId');
            if (!app) return res.status(404).json({ message: "Application not found" });
            res.json(app);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // GET APPLICANTS FOR A SPECIFIC JOB (FOR EMPLOYER)
    getApplicantsForJob: async (req, res) => {
        const { jobId } = req.params;
        try {
            const applicants = await JobApplication.find({ jobId }).sort({ appliedAt: -1 });
            res.json(applicants);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // UPDATE APPLICATION STATUS (FOR EMPLOYER)
    updateStatus: async (req, res) => {
        const { applicationId } = req.params;
        const { status, message } = req.body;
        try {
            const application = await JobApplication.findById(applicationId);
            if (!application) return res.status(404).json({ message: "Application not found" });

            application.status = status;
            if (message) application.employerMessage = message;

            await application.save();
            res.json(application);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = jobApplicationController;
