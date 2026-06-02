const express = require("express");
const router = express.Router();
const controller = require("../controllers/formsController");

router.get("/", controller.listForms);
router.get("/responses/all", controller.listResponses);
router.post("/", controller.createForm);        // ← add
router.put("/:slug", controller.updateForm);    // ← add
router.delete("/:slug", controller.deleteForm); // ← add
router.get("/:slug", controller.getForm);
router.post("/:slug/responses", controller.addResponse);

module.exports = router;