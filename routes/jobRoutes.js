const express = require("express");
const jobRoutes = express.Router();
const Job = require("../models/JobModel");
const { createJob, getJobs } = require("../controllers/jobController");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");

jobRoutes.post("/", userAuthentication, isAdmin, createJob);   // admin form
jobRoutes.get("/", getJobs);      // careers page + email
jobRoutes.get("/:slug", async (req, res) => {
  const job = await Job.findOne({ slug: req.params.slug, isActive: true });
  if (!job) return res.status(404).json({ message: "Job is not found" });
  res.json(job);
});

module.exports = jobRoutes;
