const JobPosting = require('../models/JobPosting');

exports.createJobPosting = async (req, res) => {
    try {
        const jobData = req.body;
        // The employerId should be passed from frontend
        const newJob = new JobPosting(jobData);
        await newJob.save();
        res.status(201).json({ message: 'Job posted successfully', job: newJob });
    } catch (error) {
        console.error('Error creating job posting:', error);
        res.status(500).json({ message: 'Error creating job posting', error: error.message });
    }
};

exports.getJobPostings = async (req, res) => {
    try {
        const jobs = await JobPosting.find().sort({ createdAt: -1 });
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching job postings', error: error.message });
    }
};

exports.getEmployerJobs = async (req, res) => {
    try {
        const { employerId } = req.params;
        const jobs = await JobPosting.find({ employerId }).sort({ createdAt: -1 });
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employer jobs', error: error.message });
    }
};

exports.getJobDetails = async (req, res) => {
    try {
        const job = await JobPosting.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching job details', error: error.message });
    }
};
