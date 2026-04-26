const express = require("express");
const ajnoraRouters = express.Router();
const ajnoraController = require("../controllers/ajnoraController");
const upload = require("../middlewares/cloudinary");

ajnoraRouters.post("/", upload.any(), ajnoraController.createEntry);
ajnoraRouters.get("/", ajnoraController.getAllEntries);
ajnoraRouters.get("/stats", ajnoraController.getStats);
ajnoraRouters.get("/:id", ajnoraController.getEntry);
ajnoraRouters.patch("/:id", upload.any(), ajnoraController.updateEntry);
ajnoraRouters.delete("/:id", ajnoraController.deleteEntry);

module.exports = ajnoraRouters;
