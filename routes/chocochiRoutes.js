const express = require("express");
const chocochiController = require("../controllers/chocochiController");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

const chocochiRoutes = express.Router();

// Public route to register
chocochiRoutes.post("/register", chocochiController.createRegistration);

// Admin route to fetch registrations
chocochiRoutes.get(
  "/registrations",
  userAuthentication,
  isAdmin,
  chocochiController.getRegistrations
);

module.exports = chocochiRoutes;
