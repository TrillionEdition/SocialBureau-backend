const express = require("express");
const router = express.Router();
const controller = require("../controllers/formsController");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

router.get("/", userAuthentication, isAdmin, controller.listForms);
router.get("/responses/all", userAuthentication, isAdmin, controller.listResponses);
router.post("/", userAuthentication, isAdmin, controller.createForm);
router.put("/:slug", userAuthentication, isAdmin, controller.updateForm);
router.delete("/:slug", userAuthentication, isAdmin, controller.deleteForm);
router.get("/:slug", controller.getForm);
router.post("/:slug/responses", controller.addResponse);

module.exports = router;