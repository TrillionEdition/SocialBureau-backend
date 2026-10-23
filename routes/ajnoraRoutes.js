const express = require("express");
const ajnoraRouters = express.Router();
const ajnoraController = require("../controllers/ajnoraController");
const upload = require("../middlewares/cloudflare");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

ajnoraRouters.post("/", userAuthentication, isAdmin, upload.any("socialbureau-media/images/ajnora"), ajnoraController.createEntry);
ajnoraRouters.get("/", ajnoraController.getAllEntries);
ajnoraRouters.get("/stats", ajnoraController.getStats);
ajnoraRouters.get("/:id", ajnoraController.getEntry);
ajnoraRouters.patch("/:id", userAuthentication, isAdmin, upload.any("socialbureau-media/images/ajnora"), ajnoraController.updateEntry);
ajnoraRouters.delete("/:id", userAuthentication, isAdmin, ajnoraController.deleteEntry);

module.exports = ajnoraRouters;
