const Ajnora = require("../models/Ajnora");
const emailService = require("../services/emailService");

const ajnoraController = {
  // Create new entry
  createEntry: async (req, res) => {
    try {
        //      Fields that need to be parsed from JSON strings because FormData stringifies them
        const jsonFields = [
          'partnersList', 
          'uploadedFiles', 
          'legalChecks', 
          'serviceCategories', 
          'currentOps', 
          'expansionTarget', 
          'leadSources', 
          'servicesNeeded',
          'socialMedia'
        ];

        jsonFields.forEach(field => {
          if (typeof req.body[field] === 'string') {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
        });

        const uploadedFilesMap = {};
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => {
            if (file.fieldname === "brandFace") {
              req.body.brandFaceLink = file.location;
            } else if (file.fieldname.startsWith("partner_photo_")) {
              const index = parseInt(file.fieldname.replace("partner_photo_", ""));
              if (Array.isArray(req.body.partnersList) && req.body.partnersList[index]) {
                if (!req.body.partnersList[index].photo) req.body.partnersList[index].photo = {};
                req.body.partnersList[index].photo.url = file.location;
              }
            } else {
              if (!uploadedFilesMap[file.fieldname]) {
                uploadedFilesMap[file.fieldname] = [];
              }
              uploadedFilesMap[file.fieldname].push({
                name: file.originalname,
                url: file.location,
                type: file.mimetype,
                size: (file.size / 1024).toFixed(2) + ' KB',
                uploadedAt: new Date().toISOString()
              });
            }
          });
          
          req.body.uploadedFiles = { 
            ...(req.body.uploadedFiles || {}), 
            ...uploadedFilesMap 
          };
        }

      const newEntry = new Ajnora(req.body);
      const savedEntry = await newEntry.save();

      // Send confirmation email to the client
      try {
        await emailService.sendAjnoraConfirmation(savedEntry);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // We don't want to fail the whole request if email fails, but we log it
      }

      res.status(201).json({ success: true, data: savedEntry });
    } catch (error) {
      console.error("Create entry error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all entries
  getAllEntries: async (req, res) => {
    try {
      const entries = await Ajnora.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get single entry
  getEntry: async (req, res) => {
    try {
      const entry = await Ajnora.findById(req.params.id);
      if (!entry) return res.status(404).json({ success: false, message: "Entry not found" });
      res.status(200).json({ success: true, data: entry });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update entry
  updateEntry: async (req, res) => {
    try {
        const jsonFields = [
          'partnersList', 
          'uploadedFiles', 
          'legalChecks', 
          'serviceCategories', 
          'currentOps', 
          'expansionTarget', 
          'leadSources', 
          'servicesNeeded',
          'socialMedia'
        ];

        jsonFields.forEach(field => {
          if (typeof req.body[field] === 'string') {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
        });

        const uploadedFilesMap = {};
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => {
            if (file.fieldname === "brandFace") {
              req.body.brandFaceLink = file.location;
            } else if (file.fieldname.startsWith("partner_photo_")) {
              const index = parseInt(file.fieldname.replace("partner_photo_", ""));
              if (Array.isArray(req.body.partnersList) && req.body.partnersList[index]) {
                if (!req.body.partnersList[index].photo) req.body.partnersList[index].photo = {};
                req.body.partnersList[index].photo.url = file.location;
              }
            } else {
              if (!uploadedFilesMap[file.fieldname]) {
                uploadedFilesMap[file.fieldname] = [];
              }
              uploadedFilesMap[file.fieldname].push({
                name: file.originalname,
                url: file.location,
                type: file.mimetype,
                size: (file.size / 1024).toFixed(2) + ' KB',
                uploadedAt: new Date().toISOString()
              });
            }
          });
          
          req.body.uploadedFiles = { 
            ...(req.body.uploadedFiles || {}), 
            ...uploadedFilesMap 
          };
        }

      const updatedEntry = await Ajnora.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!updatedEntry) return res.status(404).json({ success: false, message: "Entry not found" });
      res.status(200).json({ success: true, data: updatedEntry });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Delete entry
  deleteEntry: async (req, res) => {
    try {
      const deletedEntry = await Ajnora.findByIdAndDelete(req.params.id);
      if (!deletedEntry) return res.status(404).json({ success: false, message: "Entry not found" });
      res.status(200).json({ success: true, message: "Entry deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
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
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = ajnoraController;
