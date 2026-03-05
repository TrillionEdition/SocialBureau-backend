const express = require('express');
const router = express.Router();
const ExternalJob = require('../models/ExternalJob');

// GET all active external jobs
router.get('/', async (req, res) => {
    try {
        const jobs = await ExternalJob.find({ isActive: true }).sort({ postedAt: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single external job
router.get('/:id', async (req, res) => {
    try {
        const job = await ExternalJob.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST - add new external job (admin/employer)
router.post('/', async (req, res) => {
    try {
        const job = new ExternalJob(req.body);
        await job.save();
        res.status(201).json(job);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT - update external job
router.put('/:id', async (req, res) => {
    try {
        const job = await ExternalJob.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(job);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE - remove external job
router.delete('/:id', async (req, res) => {
    try {
        await ExternalJob.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
