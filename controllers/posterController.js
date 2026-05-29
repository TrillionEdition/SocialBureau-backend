const Poster = require("../models/posterModel");
const upload = require("../middlewares/cloudflare");

// 1. Add a new poster
exports.addPoster = async (req, res) => {
  try {
    const { title, description, date, category } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const image = req.files && req.files.image && req.files.image[0] ? req.files.image[0].location : null;
    const mobileImage = req.files && req.files.mobileImage && req.files.mobileImage[0] ? req.files.mobileImage[0].location : "";

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Desktop poster image is required",
      });
    }

    const poster = new Poster({
      title,
      description,
      date,
      category,
      image,
      mobileImage,
    });

    await poster.save();

    res.status(201).json({
      success: true,
      message: "Poster added successfully",
      data: poster,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Get all posters (Admin/Public)
exports.getAllPosters = async (req, res) => {
  try {
    const filter = {};
    
    // Support fetching only active ones for the frontend public page if needed
    if (req.query.active === "true") {
      filter.isActive = true;
    }

    const posters = await Poster.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: posters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 3. Update a poster (Active toggle, image update, or title/desc/date)
exports.updatePoster = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const poster = await Poster.findById(id);
    if (!poster) {
      return res.status(404).json({
        success: false,
        message: "Poster not found",
      });
    }

    // If new desktop image is uploaded, delete the old one from R2
    if (req.files && req.files.image && req.files.image[0]) {
      if (poster.image) {
        await upload.deleteFromR2(poster.image);
      }
      updateData.image = req.files.image[0].location;
    }

    // If new mobile image is uploaded, delete the old one from R2
    if (req.files && req.files.mobileImage && req.files.mobileImage[0]) {
      if (poster.mobileImage) {
        await upload.deleteFromR2(poster.mobileImage);
      }
      updateData.mobileImage = req.files.mobileImage[0].location;
    }

    // Handle string to boolean conversion if relevant (from FormData uploads)
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === "true" || updateData.isActive === true;
    }

    const updatedPoster = await Poster.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Poster updated successfully",
      data: updatedPoster,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 4. Delete a poster (Deletes document and deletes R2 file)
exports.deletePoster = async (req, res) => {
  try {
    const { id } = req.params;

    const poster = await Poster.findById(id);
    if (!poster) {
      return res.status(404).json({
        success: false,
        message: "Poster not found",
      });
    }

    // Delete desktop image file from Cloudflare R2
    if (poster.image) {
      await upload.deleteFromR2(poster.image);
    }

    // Delete mobile image file from Cloudflare R2
    if (poster.mobileImage) {
      await upload.deleteFromR2(poster.mobileImage);
    }

    await Poster.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Poster deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
