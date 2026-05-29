const Reel = require("../models/reelModel");

// Helper: normalize Instagram URL to a clean embed-ready permalink
const normalizeInstagramUrl = (url) => {
  try {
    const u = new URL(url.trim());
    // Keep only the pathname part, remove query params
    const clean = `https://www.instagram.com${u.pathname}`;
    return clean.endsWith("/") ? clean : clean + "/";
  } catch {
    return url.trim();
  }
};

// 1. Add a new reel
exports.addReel = async (req, res) => {
  try {
    const { url, caption, order } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Instagram reel URL is required",
      });
    }

    const cleanUrl = normalizeInstagramUrl(url);

    const reel = new Reel({
      url: cleanUrl,
      caption: caption || "",
      order: order || 0,
    });

    await reel.save();

    res.status(201).json({
      success: true,
      message: "Reel added successfully",
      data: reel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Get all reels
exports.getAllReels = async (req, res) => {
  try {
    const filter = {};

    if (req.query.active === "true") {
      filter.isActive = true;
    }

    const reels = await Reel.find(filter).sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reels,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 3. Update a reel (toggle active, reorder, update caption)
exports.updateReel = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === "true" || updateData.isActive === true;
    }

    if (updateData.url) {
      updateData.url = normalizeInstagramUrl(updateData.url);
    }

    const reel = await Reel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reel updated successfully",
      data: reel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 4. Delete a reel
exports.deleteReel = async (req, res) => {
  try {
    const { id } = req.params;

    const reel = await Reel.findByIdAndDelete(id);

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reel deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
