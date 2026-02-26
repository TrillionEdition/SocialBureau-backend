const express = require("express");
const router = express.Namespace ? express.Router() : express.Router();
const partnershipController = require("../controllers/partnershipController");
const userAuthentication = require("../middlewares/userAuthentication");
const adminAuthentication = require("../middlewares/adminAuthentication");

router.post("/", userAuthentication, adminAuthentication, partnershipController.createPartner);
router.get("/", partnershipController.getPartners);
router.get("/:param", partnershipController.getPartnerByParam);
router.put("/:id", userAuthentication, adminAuthentication, partnershipController.updatePartner);
router.delete("/:id", userAuthentication, adminAuthentication, partnershipController.deletePartner);

module.exports = router;
