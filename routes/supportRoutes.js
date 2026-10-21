const express = require("express");
const supportController = require("../controllers/supportController");

const router = express.Router();

router.post("/contact", supportController.sendContactMessage);

module.exports = router;
