const { BASE_URL } = require('../../SocialBureau/utils/urls');
const JobApplication = require('../models/JobApplication');
const JobPosting = require('../models/JobPosting');
const User = require('../models/userModel');
const atsEngine = require('../utils/atsEngine');

const jobApplicationController = {
    // APPLY TO JOB
    applyToJob: async (req, res) => {
        const { jobId, candidateName, candidateEmail, candidatePhone, coverLetter, userId, relocationInterest } = req.body;
        const resumeFile = req.file;

        try {
            // Check if jobId is a valid ObjectId
            const mongoose = require('mongoose');
            const ExternalJob = require('../models/ExternalJob');

            if (!mongoose.Types.ObjectId.isValid(jobId)) {
                return res.status(400).json({ message: "Invalid Job ID format. Standard local jobs cannot be applied to in this demo." });
            }

            // Check if job exists in either JobPosting or ExternalJob
            let job = await JobPosting.findById(jobId);
            if (!job) {
                job = await ExternalJob.findById(jobId);
            }
            
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
                const jobTitle = job.jobTitle || job.title || "";
                const companyName = job.companyName || job.company || "";
                const roleSummaryStr = (job.roleSummary || []).join(' ');
                const responsibilitiesStr = (job.responsibilities || []).join(' ');
                const fullJd = `${jobTitle} ${companyName} ${job.description} ${job.about || ''} ${roleSummaryStr} ${responsibilitiesStr}`;
                atsResult = atsEngine.calculateScore(resumeText, fullJd);

                // Save to local uploads folder
                const fs = require('fs');
                const path = require('path');
                const fileName = Date.now() + '-' + resumeFile.originalname;
                const uploadPath = path.join(__dirname, '../uploads', fileName);
                fs.writeFileSync(uploadPath, resumeFile.buffer);
                
                resumeUrl = `${BASE_URL}/uploads/${fileName}`;
            }

            const isExternal = !!(await ExternalJob.findById(jobId));

            const application = new JobApplication({
                jobId,
                jobModel: isExternal ? 'ExternalJob' : 'JobPosting',
                userId,
                candidateName,
                candidateEmail,
                candidatePhone,
                resumeUrl,
                coverLetter,
                relocationInterest: relocationInterest === 'true' || relocationInterest === true,
                atsResult,
                status: 'pending'
            });

            await application.save();
            res.status(201).json({ 
                message: "Application submitted successfully",
                application 
            });
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

    // UNSAVE JOB
    unsaveJob: async (req, res) => {
        const { userId, jobId } = req.body;
        try {
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });

            user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
            await user.save();
            res.json({ message: "Job unsaved", savedJobs: user.savedJobs });
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
            if (message) {
                application.messages.push({
                    senderRole: 'employer',
                    content: message,
                    timestamp: new Date()
                });
            }

            await application.save();
            res.json(application);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ADD MESSAGE
    addMessage: async (req, res) => {
        const { applicationId } = req.params;
        const { content, senderRole, senderId } = req.body;
        try {
            const application = await JobApplication.findById(applicationId);
            if (!application) return res.status(404).json({ message: "Application not found" });

            application.messages.push({
                senderId,
                senderRole,
                content,
                timestamp: new Date()
            });

            await application.save();
            res.json(application);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // BULK MESSAGE (FOR EMPLOYER)
    bulkMessage: async (req, res) => {
        const { jobId, content, senderId } = req.body;
        try {
            const applications = await JobApplication.find({ jobId });
            const promises = applications.map(app => {
                app.messages.push({
                    senderId,
                    senderRole: 'employer',
                    content,
                    timestamp: new Date()
                });
                return app.save();
            });
            await Promise.all(promises);
            res.json({ message: `Message sent to ${applications.length} candidates` });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // GET ALL CONVERSATIONS FOR A USER
    getUserConversations: async (req, res) => {
        const { userId } = req.params;
        try {
            // Find jobs where this user is employer
            const myJobs = await JobPosting.find({ employerId: userId });
            const jobIds = myJobs.map(j => j._id);

            // Find all applications where either the candidate is this user OR the job belongs to this user
            const applications = await JobApplication.find({
                $or: [
                    { userId: userId },
                    { jobId: { $in: jobIds } }
                ],
                "messages.0": { $exists: true } // Only if they have messages
            }).populate('jobId').sort({ updatedAt: -1 });

            res.json(applications);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = jobApplicationController;
