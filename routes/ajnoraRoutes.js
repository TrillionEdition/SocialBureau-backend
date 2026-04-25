const express = require("express");
const router = express.Router();
const ajnoraController = require("../controllers/ajnoraController");

router.post("/", ajnoraController.createEntry);
router.get("/", ajnoraController.getAllEntries);
router.get("/stats", ajnoraController.getStats);
router.get("/:id", ajnoraController.getEntry);
router.patch("/:id", ajnoraController.updateEntry);
router.delete("/:id", ajnoraController.deleteEntry);

module.exports = router;
