const express = require("express");
// FIFA routes disabled — router returns 503 on all paths to avoid breaking imports.
const fifaController = require("../controllers/fifaController");
const fifaRoutes = express.Router();

fifaRoutes.use((req, res) => fifaController.getMatches(req, res));

module.exports = fifaRoutes;
