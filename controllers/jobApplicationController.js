const JobApplication = require('../models/JobApplication');
const JobPosting = require('../models/JobPosting');
const User = require('../models/userModel');
const atsEngine = require('../utils/atsEngine');
const mongoose = require('mongoose');
const ExternalJob = require('../models/ExternalJob');
const Job = require('../models/JobModel');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// Initialize R2 client for resumes
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${(process.env.R2_ENDPOINT || '').split('/')[0].replace(/^https?:\/\//, '')}`,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const jobApplicationController = {
    // APPLY TO JOB (Updated for R2 and Internal Form)
    applyToJob: async (req, res) => {
    const { jobId, candidateName, candidateEmail, candidatePhone, coverLetter, userId } = req.body;
    const resumeFile = req.file;
    try {
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: "Invalid Job ID format." });
        }

        // ✅ Cache buffer BEFORE anything else consumes it
        const resumeBuffer = resumeFile?.buffer ? Buffer.from(resumeFile.buffer) : null;

        // Check if job exists in any model — collapse into ONE query chain
        let job = await Job.findById(jobId)
            ?? await JobPosting.findById(jobId)
            ?? await ExternalJob.findById(jobId);

        if (!job) return res.status(404).json({ message: "Job not found" });

        let resumeUrl = "";
        if (resumeFile) {
            resumeUrl = resumeFile.location || "";

            if (!resumeUrl) {
                console.error("❌ resumeFile.location is empty. Upload may have failed silently.");
            }

            // ✅ Use cached buffer for ATS — doesn't depend on upload state
            if (resumeBuffer) {
                try {
                    const resumeText = await atsEngine.extractTextFromFile(
                        resumeBuffer,
                        resumeFile.mimetype
                    );
                    const fullJd = `${job.title || ""} ${job.description || ""} ${job.about || ""}`;
                    req.atsResult = atsEngine.calculateScore(resumeText, fullJd);
                } catch (e) {
                    console.warn("ATS analysis skipped:", e.message);
                }
            }
        }

        // ✅ Avoid 2 extra DB round-trips — reuse job already fetched above
        const jobModel = job instanceof Job
            ? 'Job'
            : job instanceof ExternalJob
                ? 'ExternalJob'
                : 'JobPosting';

        const application = new JobApplication({
            jobId,
            jobModel,
            userId: userId || null,
            candidateName,
            candidateEmail,
            candidatePhone,
            resumeUrl,
            coverLetter,
            atsResult: req.atsResult || null,
            status: 'pending'
        });

        await application.save();
        res.status(201).json({
            message: "Application submitted successfully",
            application
        });

    } catch (error) {
        console.error("Apply Error:", error); // ✅ Will now show the real error
        res.status(500).json({ message: error.message });
    }
},

    // GET ALL APPLICATIONS (FOR ADMIN)
    getAllApplications: async (req, res) => {
        try {
            const { jobId } = req.query;
            const filter = jobId ? { jobId } : {};
            const applications = await JobApplication.find(filter)
                .populate('jobId')
                .populate('userId', 'name email role')
                .sort({ appliedAt: -1 });
            res.json(applications);
        } catch (error) {
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

    // GET USER APPLICATIONS
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
            if (!user) return res.status(404).json({ message: "User not found" });
            res.json(user.savedJobs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // UPDATE STATUS
    updateStatus: async (req, res) => {
        const { applicationId } = req.params;
        const { status } = req.body;
        try {
            const application = await JobApplication.findByIdAndUpdate(
                applicationId, 
                { status }, 
                { new: true }
            );
            res.json(application);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // REMAINING METHODS...
    getApplication: async (req, res) => {
        try {
            const app = await JobApplication.findById(req.params.applicationId).populate('jobId');
            res.json(app);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getApplicantsForJob: async (req, res) => {
        try {
            const apps = await JobApplication.find({ jobId: req.params.jobId }).sort({ appliedAt: -1 });
            res.json(apps);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ADD MESSAGE TO APPLICATION
    addMessage: async (req, res) => {
        const { applicationId } = req.params;
        const { senderId, message } = req.body;
        try {
            const application = await JobApplication.findById(applicationId);
            if (!application) return res.status(404).json({ message: "Application not found" });

            application.messages.push({
                senderId,
                message,
                timestamp: new Date()
            });

            await application.save();
            res.json(application);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // BULK MESSAGE TO APPLICANTS
    bulkMessage: async (req, res) => {
        const { applicationIds, message, senderId } = req.body;
        try {
            await JobApplication.updateMany(
                { _id: { $in: applicationIds } },
                { 
                    $push: { 
                        messages: { 
                            senderId, 
                            message, 
                            timestamp: new Date() 
                        } 
                    } 
                }
            );
            res.json({ success: true, message: "Bulk message sent" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // GET USER CONVERSATIONS
    getUserConversations: async (req, res) => {
        const { userId } = req.params;
        try {
            const apps = await JobApplication.find({ 
                $or: [{ userId }, { candidateEmail: req.query.email }] 
            }).populate('jobId');
            res.json(apps);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    // DELETE APPLICATION
    deleteApplication: async (req, res) => {
        const { id } = req.params;
        try {
            const application = await JobApplication.findByIdAndDelete(id);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Optional: Delete local resume file if exists
            if (application.resumeUrl && application.resumeUrl.includes(req.get('host'))) {
                const fs = require('fs');
                const path = require('path');
                // Extract relative path from URL: http://host/assets/job/file.pdf -> assets/job/file.pdf
                const urlPath = new URL(application.resumeUrl).pathname;
                const filePath = path.join(__dirname, '..', urlPath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            res.json({ message: "Application deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = jobApplicationController;
