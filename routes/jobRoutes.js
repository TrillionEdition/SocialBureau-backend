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
  deactivateJob,
} = require("../controllers/jobController");
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");
const { getCache, setCache, invalidateCache, CACHE_EXPIRY } = require("../utils/cacheUtils");

// CREATE JOB (admin only)
jobRoutes.post("/", userAuthentication, isAdmin, createJob);

// GET ALL JOBS (with caching)
jobRoutes.get("/", getJobs);

// GET SINGLE JOB BY SLUG (with caching)
jobRoutes.get("/:slug", getJobBySlug);

// UPDATE JOB (admin only) - Optional
jobRoutes.put("/:id", userAuthentication, isAdmin, updateJob);

// DELETE JOB (admin only) - Optional
jobRoutes.delete("/:id", userAuthentication, isAdmin, deleteJob);

// DEACTIVATE JOB (soft delete - admin only) - Optional
jobRoutes.patch("/:id/deactivate", userAuthentication, isAdmin, deactivateJob);

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