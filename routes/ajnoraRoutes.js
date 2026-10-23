const express = require("express");
const ajnoraRouters = express.Router();
const ajnoraController = require("../controllers/ajnoraController");
const upload = require("../middlewares/cloudflare");

ajnoraRouters.post("/", upload.any("socialbureau-media/images/ajnora"), ajnoraController.createEntry);
ajnoraRouters.get("/", ajnoraController.getAllEntries);
ajnoraRouters.get("/stats", ajnoraController.getStats);
ajnoraRouters.get("/:id", ajnoraController.getEntry);
ajnoraRouters.patch("/:id", upload.any("socialbureau-media/images/ajnora"), ajnoraController.updateEntry);
ajnoraRouters.delete("/:id", ajnoraController.deleteEntry);

module.exports = ajnoraRouters;
