const asyncHandler = require("express-async-handler");
const AuditReport = require("./auditReportModel");
const Client = require("../../models/clientsModel");
const User = require("../../models/userModel");
const uploadService = require("../../middlewares/cloudflare");
const bcrypt = require("bcryptjs");

const auditReportController = {
  // GET /api/audit-reports/admin/clients
  getClientsAdmin: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    let query = { isAuditClient: true };
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const clients = await Client.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const clientsWithRoles = await Promise.all(
      clients.map(async (c) => {
        const user = await User.findOne({ email: c.email });
        return {
          ...c.toObject(),
          role: user ? user.role : "partnership",
        };
      })
    );

    const total = await Client.countDocuments(query);

    res.json({
      success: true,
      data: clientsWithRoles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }),

  // GET /api/audit-reports/admin/client/:clientId
  getClientDetailsAdmin: asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      res.status(404);
      throw new Error("Client not found");
    }

    const reports = await AuditReport.find({ clientId: req.params.clientId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      client,
      reports,
    });
  }),

  // POST /api/audit-reports/admin/upload
  uploadReportAdmin: asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error("PDF file is required");
    }

    const { title, description, category, auditPeriod, clientId, status, amt } = req.body;

    if (!title || !category || !auditPeriod || !clientId) {
      res.status(400);
      throw new Error("Title, category, audit period, and client are required fields");
    }

    const clientExists = await Client.findById(clientId);
    if (!clientExists) {
      res.status(404);
      throw new Error("Client not found");
    }

    const parsedAmt = amt ? parseFloat(amt) : undefined;

    const report = await AuditReport.create({
      title,
      description,
      category,
      auditPeriod,
      pdfUrl: req.file.location,
      pdfFileName: req.file.originalname,
      pdfSize: req.file.size,
      uploadedBy: req.user.name || req.user.email,
      clientId,
      status: status || "published",
      amt: !isNaN(parsedAmt) ? parsedAmt : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Report uploaded successfully",
      data: report,
    });
  }),

  // PUT /api/audit-reports/admin/report/:reportId
  updateReportAdmin: asyncHandler(async (req, res) => {
    const { title, description, category, auditPeriod, status, amt } = req.body;

    const update = { title, description, category, auditPeriod, status };
    if (amt !== undefined) {
      const parsedAmt = parseFloat(amt);
      if (!isNaN(parsedAmt)) update.amt = parsedAmt;
    }

    const report = await AuditReport.findByIdAndUpdate(
      req.params.reportId,
      update,
      { new: true, runValidators: true }
    );

    if (!report) {
      res.status(404);
      throw new Error("Report not found");
    }

    res.json({
      success: true,
      message: "Report updated successfully",
      data: report,
    });
  }),

  // DELETE /api/audit-reports/admin/report/:reportId
  deleteReportAdmin: asyncHandler(async (req, res) => {
    const report = await AuditReport.findById(req.params.reportId);
    if (!report) {
      res.status(404);
      throw new Error("Report not found");
    }

    // Attempt to delete from Cloudflare R2
    try {
      if (report.pdfUrl) {
        await uploadService.deleteFromR2(report.pdfUrl);
      }
    } catch (err) {
      console.error("Failed to delete PDF from R2:", err.message);
    }

    await report.deleteOne();

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  }),

  // GET /api/audit-reports/my-reports
  getMyReports: asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const clientIds = user.clients ? user.clients.map((id) => id.toString()) : [];
    
    // Fallback: match by email to associate User account with Client account
    const matchedClient = await Client.findOne({ email: user.email.toLowerCase().trim() });
    const allClientIds = [...clientIds];
    if (matchedClient) {
      allClientIds.push(matchedClient._id.toString());
    }

    const uniqueClientIds = [...new Set(allClientIds)];

    const reports = await AuditReport.find({
      clientId: { $in: uniqueClientIds },
      status: "published",
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports,
      isClient: uniqueClientIds.length > 0,
    });
  }),

  // GET /api/audit-reports/download/:reportId
  downloadReport: asyncHandler(async (req, res) => {
    const report = await AuditReport.findById(req.params.reportId);
    if (!report) {
      res.status(404);
      throw new Error("Report not found");
    }

    const role = req.user.role ? req.user.role.toLowerCase() : "";
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const clientIds = user.clients ? user.clients.map((id) => id.toString()) : [];
    const matchedClient = await Client.findOne({ email: user.email.toLowerCase().trim() });
    if (matchedClient) {
      clientIds.push(matchedClient._id.toString());
    }

    const uniqueClientIds = [...new Set(clientIds)];
    const isClient = uniqueClientIds.length > 0;

    // Admins and partners (with no client company associations) are exempt
    const isAdminOrPartner = role === "admin" || ((role === "partner" || role === "partnership") && !isClient);

    if (!isAdminOrPartner) {
      if (!uniqueClientIds.includes(report.clientId.toString())) {
        res.status(403);
        throw new Error("Access denied. You can only download reports assigned to your account.");
      }

      if (!report.isPaid) {
        res.status(402);
        throw new Error("Payment required. Please complete the payment to download this report.");
      }
    }

    // Return the Cloudflare R2 public URL
    res.json({ success: true, url: report.pdfUrl });
  }),

  // POST /api/audit-reports/admin/clients
  createClientAdmin: asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email, and password are required");
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const userExists = await User.findOne({ email: emailLower });
    if (userExists) {
      res.status(400);
      throw new Error("A user with this email already exists");
    }

    // Check if client already exists
    const clientExists = await Client.findOne({
      $or: [{ name: name.trim() }, { email: emailLower }],
    });

    if (clientExists) {
      res.status(400);
      throw new Error("A client with this name or email already exists");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the client
    const newClient = await Client.create({
      name: name.trim(),
      email: emailLower,
      status: "active",
      isAuditClient: true,
      password: password,
    });

    // Create the user
    const newUser = await User.create({
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      role: role === "admin" ? "admin" : "partnership",
      clients: [newClient._id],
      verification: true,
    });

    res.status(201).json({
      success: true,
      message: "Client and user account created successfully",
      client: newClient,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  }),
};

module.exports = auditReportController;
