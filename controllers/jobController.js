const Job = require("../models/JobModel");
const slugify = require("slugify");
const { getCache, setCache, invalidateJobCaches, CACHE_EXPIRY } = require("../utils/cacheUtils");

// CREATE JOB
exports.createJob = async (req, res) => {
  try {
    const slug = slugify(req.body.title, { lower: true });

    const job = await Job.create({
      ...req.body,
      slug: slug,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    });

    // Invalidate cache when new job is created
    await invalidateJobCaches();

    res.status(201).json(job);
  } catch (err) {
    console.error("Error creating job:", err.message);
    res.status(500).json({ message: "Job creation failed", error: err.message });
  }
};

// GET ACTIVE JOBS (with Redis caching)
exports.getJobs = async (req, res) => {
  try {
    // Try to get from cache first
    const cachedJobs = await getCache("jobs:all");
    if (cachedJobs) {
      return res.json(cachedJobs);
    }

    // If not cached, fetch from database
    let jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });
    
    // If no active jobs found, activate all jobs with missing isActive field
    if (jobs.length === 0) {
      const allJobs = await Job.find().sort({ createdAt: -1 });
      
      if (allJobs.length > 0) {
        // Set all jobs to active
        await Job.updateMany({ isActive: { $exists: false } }, { isActive: true });
        jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });
      }
    }

    // Cache the result
    await setCache("jobs:all", jobs, CACHE_EXPIRY.JOBS_LIST);

    res.json(jobs);
  } catch (err) {
    console.error("Error fetching jobs:", err.message);
    res.status(500).json({ message: "Failed to fetch jobs", error: err.message });
  }
};

// GET SINGLE JOB BY SLUG (with Redis caching)
exports.getJobBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    const cacheKey = `job:${slug}`;

    // Try to get from cache first
    const cachedJob = await getCache(cacheKey);
    if (cachedJob) {
      return res.json(cachedJob);
    }

    // If not cached, fetch from database
    // First try with isActive: true
    let job = await Job.findOne({
      slug: slug,
      isActive: true,
    });

    // If not found, try without isActive filter (for debugging)
    if (!job) {
      job = await Job.findOne({ slug: slug });
      
      if (job && !job.isActive) {
        // Set the inactive job as active
        await Job.findByIdAndUpdate(job._id, { isActive: true });
      }
    }

    if (!job) {
      // Show all available slugs for debugging
      const allJobs = await Job.find().select("slug title isActive");
      return res.status(404).json({ 
        message: "Job not found",
        searchedSlug: slug,
        availableJobs: allJobs.map(j => ({ slug: j.slug, title: j.title }))
      });
    }

    // Cache the result
    await setCache(cacheKey, job, CACHE_EXPIRY.SINGLE_JOB);

    res.json(job);
  } catch (err) {
    console.error("Error fetching job:", err.message);
    res.status(500).json({ message: "Failed to fetch job", error: err.message });
  }
};

// UPDATE JOB (Optional - if you have this endpoint)
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Invalidate related caches
    await invalidateJobCaches();
    await invalidateCache(`job:${job.slug}`);

    res.json(job);
  } catch (err) {
    console.error("Error updating job:", err);
    res.status(500).json({ message: "Failed to update job" });
  }
};

// DELETE JOB (Optional - if you have this endpoint)
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Invalidate related caches
    await invalidateJobCaches();
    await invalidateCache(`job:${job.slug}`);

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ message: "Failed to delete job" });
  }
};

// DEACTIVATE JOB (soft delete)
exports.deactivateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Invalidate caches
    await invalidateJobCaches();
    await invalidateCache(`job:${job.slug}`);

    res.json({ message: "Job deactivated successfully", job });
  } catch (err) {
    console.error("Error deactivating job:", err);
    res.status(500).json({ message: "Failed to deactivate job" });
  }
};