const MediaWaitlist = require('../models/MediaWaitlist');

exports.createEntry = async (req, res) => {
    try {
        const { name, email, source } = req.body;
        
        // Check if already exists
        const existing = await MediaWaitlist.findOne({ email });
        if (existing) {
            return res.status(200).json({ 
                success: true, 
                message: 'Already on the waitlist',
                data: existing 
            });
        }

        const newEntry = new MediaWaitlist({ name, email, source });
        await newEntry.save();
        
        res.status(201).json({
            success: true,
            message: 'Successfully joined the waitlist',
            data: newEntry
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error joining waitlist',
            error: error.message
        });
    }
};

exports.getAllEntries = async (req, res) => {
    try {
        const entries = await MediaWaitlist.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: entries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching waitlist',
            error: error.message
        });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const entry = await MediaWaitlist.findByIdAndUpdate(
            id, 
            { status }, 
            { new: true }
        );
        
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        
        res.status(200).json({ success: true, data: entry });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteEntry = async (req, res) => {
    try {
        const { id } = req.params;
        await MediaWaitlist.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
