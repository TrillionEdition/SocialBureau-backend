const express = require("express");
const posterController = require("../controllers/posterController");
const upload = require("../middlewares/cloudflare");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

const posterRoutes = express.Router();

// ✅ Public route: get all posters
posterRoutes.get("/", posterController.getAllPosters);

// 🔒 Protected admin routes
posterRoutes.post(
  "/",
  userAuthentication,
  isAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 }
  ], "posters"),
  posterController.addPoster
);

posterRoutes.put(
  "/:id",
  userAuthentication,
  isAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 }
  ], "posters"),
  posterController.updatePoster
);

posterRoutes.delete(
  "/:id",
  userAuthentication,
  isAdmin,
  posterController.deletePoster
);

module.exports = posterRoutes;
