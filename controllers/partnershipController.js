const Partnership = require("../models/partnershipModel");
const asyncHandler = require("express-async-handler");

const partnershipController = {
  // Create a new partnership
  createPartner: asyncHandler(async (req, res) => {
    const { name, param, email, category, status, tags, image, subtitle, role, user } = req.body;

    if (!name || !param) {
      res.status(400);
      throw new Error("Name and param are required");
    }

    const exists = await Partnership.findOne({ 
      param: { $regex: new RegExp(`^${param}$`, "i") } 
    });
    if (exists) {
      res.status(400);
      throw new Error("URL param already exists");
    }

    const partner = await Partnership.create({
      name,
      param,
      email,
      category,
      status,
      tags,
      image,
      subtitle,
      role: role || "partnership",
      user: user || undefined,
      updatedBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: "Partner registered successfully",
      data: partner,
    });
  }),

  // Get all partnerships
  getPartners: asyncHandler(async (req, res) => {
    const partners = await Partnership.find({})
      .populate("updatedBy", "name email")
      .sort("-createdAt");

    res.json({
      success: true,
      data: partners,
    });
  }),

  // Get single partnership by param
  getPartnerByParam: asyncHandler(async (req, res) => {
    const partner = await Partnership.findOne({ 
      param: { $regex: new RegExp(`^${req.params.param}$`, "i") } 
    }).populate(
      "updatedBy",
      "name email"
    );

    if (!partner) {
      res.status(404);
      throw new Error("Partner not found");
    }

    res.json({
      success: true,
      data: partner,
    });
  }),

  // Update partnership
  updatePartner: asyncHandler(async (req, res) => {
    const partner = await Partnership.findById(req.params.id);

    if (!partner) {
      res.status(404);
      throw new Error("Partner not found");
    }

    const { name, param, email, category, status, tags, image, subtitle, role, user } = req.body;

    // Check if param is being changed and if it conflicts
    if (param && param !== partner.param) {
      const exists = await Partnership.findOne({ 
        param: { $regex: new RegExp(`^${param}$`, "i") } 
      });
      if (exists) {
        res.status(400);
        throw new Error("URL param already exists");
      }
    }

    partner.name = name || partner.name;
    partner.param = param || partner.param;
    partner.email = email !== undefined ? email : partner.email;
    partner.category = category || partner.category;
    partner.status = status || partner.status;
    partner.tags = tags || partner.tags;
    partner.image = image || partner.image;
    partner.subtitle = subtitle || partner.subtitle;
    partner.role = role || partner.role;
    partner.user = user !== undefined ? (user || undefined) : partner.user;
    partner.updatedBy = req.user?.id;

    const updatedPartner = await partner.save();

    res.json({
      success: true,
      message: "Partner updated successfully",
      data: updatedPartner,
    });
  }),

  // Delete partnership
  deletePartner: asyncHandler(async (req, res) => {
    const partner = await Partnership.findById(req.params.id);

    if (!partner) {
      res.status(404);
      throw new Error("Partner not found");
    }

    await partner.remove();

    res.json({
      success: true,
      message: "Partner removed successfully",
    });
  }),
};

module.exports = partnershipController;
