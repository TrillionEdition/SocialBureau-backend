const express = require("express");
const router = express.Router();
const auditReportController = require("./auditReportController");
const userAuthentication = require("../../middlewares/userAuthentication");
const adminAuthentication = require("../../middlewares/adminAuthentication");
const upload = require("../../middlewares/cloudflare");

// User / Client routes
router.get("/my-reports", userAuthentication, auditReportController.getMyReports);
router.get("/download/:reportId", userAuthentication, auditReportController.downloadReport);

// Admin routes
router.get("/admin/clients", userAuthentication, adminAuthentication, auditReportController.getClientsAdmin);
router.post("/admin/clients", userAuthentication, adminAuthentication, auditReportController.createClientAdmin);
router.get("/admin/client/:clientId", userAuthentication, adminAuthentication, auditReportController.getClientDetailsAdmin);
router.post("/admin/upload", userAuthentication, adminAuthentication, upload.single("pdf", "audit-reports"), auditReportController.uploadReportAdmin);
router.put("/admin/report/:reportId", userAuthentication, adminAuthentication, auditReportController.updateReportAdmin);
router.delete("/admin/report/:reportId", userAuthentication, adminAuthentication, auditReportController.deleteReportAdmin);

module.exports = router;
