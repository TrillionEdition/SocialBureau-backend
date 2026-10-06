const express = require("express");
const controller = require("./dynamicReportController");
const userAuthentication = require("../../middlewares/userAuthentication");
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
router.get("/:slug", controller.getPublic);

module.exports = router;