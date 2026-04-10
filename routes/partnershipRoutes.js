const express = require("express");
const partnershipRoutes = express.Router();
const partnershipController = require("../controllers/partnershipController");
const userAuthentication = require("../middlewares/userAuthentication");
const adminAuthentication = require("../middlewares/adminAuthentication");

partnershipRoutes.post("/", userAuthentication, adminAuthentication, partnershipController.createPartner);
partnershipRoutes.get("/", partnershipController.getPartners);
partnershipRoutes.get("/:param", partnershipController.getPartnerByParam);
partnershipRoutes.put("/:id", userAuthentication, adminAuthentication, partnershipController.updatePartner);
partnershipRoutes.delete("/:id", userAuthentication, adminAuthentication, partnershipController.deletePartner);

module.exports = partnershipRoutes;
