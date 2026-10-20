const express = require("express");
const controller = require("./dynamicReportController");
const paymentController = require("../../controllers/paymentController");
const userAuthentication = require("../../middlewares/userAuthentication");
const optionalAuthentication = require("../../middlewares/optionalAuthentication");
const adminAuthentication = require("../../middlewares/adminAuthentication");
const upload = require("../../middlewares/cloudflare");

const router = express.Router();
const adminOnly = [userAuthentication, adminAuthentication];

router.get("/admin", ...adminOnly, controller.listAdmin);
router.get("/admin/report/:id", ...adminOnly, controller.getAdmin);
router.post("/admin", ...adminOnly, controller.createAdmin);
router.put("/admin/:id", ...adminOnly, controller.updateAdmin);
router.delete("/admin/:id", ...adminOnly, controller.deleteAdmin);
router.post("/admin/upload", ...adminOnly, upload.single("file", "dynamic-reports"), controller.uploadAdmin);
router.post("/:slug/payment-order", userAuthentication, paymentController.createDynamicReportOrder);
router.post("/:slug/verify-payment", userAuthentication, paymentController.verifyDynamicReportPayment);
router.get("/:slug", optionalAuthentication, controller.getPublic);

module.exports = router;