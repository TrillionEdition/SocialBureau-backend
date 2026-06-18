const express = require("express");
const partnershipRoutes = express.Router();
const partnershipController = require("../controllers/partnershipController");
const userAuthentication = require("../middlewares/userAuthentication");
const adminAuthentication = require("../middlewares/adminAuthentication");
const upload = require("../middlewares/cloudflare");

partnershipRoutes.get("/student-stats", partnershipController.getStudentStats);
partnershipRoutes.get("/dashboard-stats", partnershipController.getDashboardStats);
partnershipRoutes.post("/schedule-meeting", partnershipController.scheduleMeeting);
partnershipRoutes.get("/check-meeting", partnershipController.checkMeeting);

partnershipRoutes.post("/", userAuthentication, adminAuthentication, partnershipController.createPartner);
partnershipRoutes.get("/", partnershipController.getPartners);
partnershipRoutes.get("/admin/:id", userAuthentication, adminAuthentication, partnershipController.getPartnerById);
partnershipRoutes.get("/my-partnership", userAuthentication, partnershipController.getMyPartnership);
partnershipRoutes.post("/my-partnership", userAuthentication, partnershipController.createOrUpdateMyPartnership);
partnershipRoutes.post("/upload", userAuthentication, upload.single("image", "socialbureau-media/images/partnerships"), partnershipController.uploadImage);
partnershipRoutes.get("/p/:param", partnershipController.checkSlugAvailability);
partnershipRoutes.get("/:param", partnershipController.getPartnerByParam);

partnershipRoutes.put("/:id/toggle-visibility", userAuthentication, partnershipController.toggleVisibility);
partnershipRoutes.put("/:id", userAuthentication, adminAuthentication, partnershipController.updatePartner);
partnershipRoutes.delete("/:id", userAuthentication, adminAuthentication, partnershipController.deletePartner);

module.exports = partnershipRoutes;
