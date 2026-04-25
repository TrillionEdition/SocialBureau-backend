const Ajnora = require("../models/Ajnora");

const ajnoraController = {
  // Create new entry
  createEntry: async (req, res) => {
    try {
      const newEntry = new Ajnora(req.body);
      const savedEntry = await newEntry.save();
      res.status(201).json({
        success: true,
        data: savedEntry,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get all entries
  getAllEntries: async (req, res) => {
    try {
      const entries = await Ajnora.find().sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        count: entries.length,
        data: entries,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get single entry
  getEntry: async (req, res) => {
    try {
      const entry = await Ajnora.findById(req.params.id);
      if (!entry) {
        return res.status(404).json({
          success: false,
          message: "Entry not found",
        });
      }
      res.status(200).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update entry
  updateEntry: async (req, res) => {
    try {
      const updatedEntry = await Ajnora.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updatedEntry) {
        return res.status(404).json({
          success: false,
          message: "Entry not found",
        });
      }
      res.status(200).json({
        success: true,
        data: updatedEntry,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Delete entry
  deleteEntry: async (req, res) => {
    try {
      const deletedEntry = await Ajnora.findByIdAndDelete(req.params.id);
      if (!deletedEntry) {
        return res.status(404).json({
          success: false,
          message: "Entry not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Entry deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get Stats
  getStats: async (req, res) => {
    try {
      const total = await Ajnora.countDocuments();
      const newLeads = await Ajnora.countDocuments({ status: "new" });
      const converted = await Ajnora.countDocuments({ status: "converted" });
      
      res.status(200).json({
        success: true,
        stats: {
          total,
          newLeads,
          converted,
          conversionRate: total > 0 ? ((converted / total) * 100).toFixed(2) : 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
};

module.exports = ajnoraController;
