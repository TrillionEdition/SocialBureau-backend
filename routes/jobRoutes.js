// const express = require("express");
// const jobRoutes = express.Router();
// const Job = require("../models/JobModel");
// const { createJob, getJobs } = require("../controllers/jobController");
// const userAuthentication = require("../middlewares/userAuthentication");
// const isAdmin = require("../middlewares/isAdmin");

// jobRoutes.post("/", userAuthentication, isAdmin, createJob);   // admin form
// jobRoutes.get("/", getJobs);      // careers page + email
// jobRoutes.get("/:slug", async (req, res) => {
//   const job = await Job.findOne({ slug: req.params.slug, isActive: true });
//   if (!job) return res.status(404).json({ message: "Job is not found" });
//   res.json(job);
// });

// module.exports = jobRoutes;

const express = require("express");
const jobRoutes = express.Router();
const Job = require("../models/JobModel");
const {
  createJob,
  getJobs,
  getJobBySlug,
  updateJob,
  deleteJob,
  toggleJobStatus,
} = require("../controllers/jobController");
const userAuthentication = require("../middlewares/userAuthentication");
const optionalAuthentication = require("../middlewares/optionalAuthentication");
const isAdmin = require("../middlewares/isAdmin");
const upload = require("../middlewares/cloudflare");

// CREATE JOB (admin/hr only)
jobRoutes.post("/", userAuthentication, isAdmin, upload.single("image", "socialbureau-media/images/jobs"), createJob);

// GET ALL JOBS (with optional auth for admin visibility)
jobRoutes.get("/", optionalAuthentication, getJobs);

// GET SINGLE JOB BY SLUG (with caching)
jobRoutes.get("/:slug", getJobBySlug);

// UPDATE JOB (admin/hr only)
jobRoutes.put("/:id", userAuthentication, isAdmin, upload.single("image", "socialbureau-media/images/jobs"), updateJob);

// DELETE JOB (admin only) - Optional
jobRoutes.delete("/:id", userAuthentication, isAdmin, deleteJob);

// DEACTIVATE/ACTIVATE JOB (toggle - admin/hr only)
jobRoutes.patch("/:id/toggle", userAuthentication, isAdmin, toggleJobStatus);

// DEBUG ENDPOINT - Get all jobs (active and inactive) for troubleshooting
jobRoutes.get("/debug/all", async (req, res) => {
  try {
    const jobs = await Job.find().select("_id slug title isActive createdAt").sort({ createdAt: -1 });
    const activeCount = jobs.filter(j => j.isActive).length;
    const inactiveCount = jobs.filter(j => !j.isActive).length;
    
    res.json({
      total: jobs.length,
      activeCount,
      inactiveCount,
      jobs
    });
  } catch (err) {
    console.error("Debug endpoint error:", err);
    res.status(500).json({ message: "Debug endpoint error", error: err.message });
  }
});

module.exports = jobRoutes;