const Job = require("../models/JobModel");
const slugify = require("slugify");
const { getCache, setCache, invalidateCache, invalidateJobCaches, CACHE_EXPIRY } = require("../utils/Cacheutils");
const { deleteFromR2 } = require("../middlewares/cloudflare");

// CREATE JOB
exports.createJob = async (req, res) => {
  try {
    const baseSlug = slugify(req.body.title, { lower: true });

    // Check if slug already exists
    let slug = baseSlug;
    const existingJob = await Job.findOne({ slug });
    if (existingJob) {
      // Append a short random string if duplicate
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const jobData = { ...req.body };

    // Parse array fields that were stringified by FormData
    const arrayFields = ['img', 'roleSummary', 'responsibilities', 'qualifications', 'experience'];
    arrayFields.forEach(field => {
      if (typeof jobData[field] === 'string') {
        try {
          jobData[field] = JSON.parse(jobData[field]);
        } catch (e) {
          // If not valid JSON, leave as is or make array
          jobData[field] = [jobData[field]];
        }
      }
    });

    // Handle image upload if present
    if (req.file && req.file.location) {
      jobData.img = Array.isArray(jobData.img) ? [...jobData.img, req.file.location] : [req.file.location];
    }

    const job = await Job.create({
      ...jobData,
      slug: slug,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    });

    // Invalidate cache when new job is created
    await invalidateJobCaches();
    await invalidateCache("jobs:staff:all");

    res.status(201).json(job);
  } catch (err) {
    console.error("Error creating job:", err.message);
    res.status(500).json({ message: "Job creation failed", error: err.message });
  }
};

// GET ACTIVE JOBS (with Redis caching)
exports.getJobs = async (req, res) => {
  try {
    const isStaff = req.user && req.user.role?.toLowerCase() === 'admin';

    // For staff, skip cache or use a different key to show hidden jobs
    const cacheKey = isStaff ? "jobs:staff:all" : "jobs:all";

    // Try to get from cache first
    const cachedJobs = await getCache(cacheKey);
    if (cachedJobs) {
      return res.json(cachedJobs);
    }

    // Define query
    const query = isStaff ? {} : { isActive: true };

    // Fetch from database
    const jobs = await Job.find(query).sort({ createdAt: -1 });

    // Cache the result
    await setCache(cacheKey, jobs, CACHE_EXPIRY.JOBS_LIST);

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
    console.log("🛠️ [UPDATE JOB] Received body:", req.body);
    if (req.file) console.log("📁 [UPDATE JOB] Received file:", req.file.originalname);

    const jobData = { ...req.body };

    // Remove immutable fields to prevent DB errors
    delete jobData._id;
    delete jobData.createdAt;
    delete jobData.updatedAt;
    delete jobData.publishedAt;
    delete jobData.__v;

    // Parse array fields that were stringified by FormData
    const arrayFields = ['img', 'roleSummary', 'responsibilities', 'qualifications', 'experience'];
    arrayFields.forEach(field => {
      if (typeof jobData[field] === 'string') {
        try {
          jobData[field] = JSON.parse(jobData[field]);
        } catch (e) {
          jobData[field] = [jobData[field]];
        }
      }
    });

    // Fetch the existing job to handle image cleanup
    const existingJob = await Job.findById(req.params.id);
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Handle image upload and cleanup
    if (req.file && req.file.location) {
      // 1. If a new image is uploaded, delete ALL old images from R2
      if (existingJob.img && existingJob.img.length > 0) {
        console.log("🗑️ Deleting old images due to new upload:", existingJob.img);
        await Promise.all(existingJob.img.map(imgUrl => deleteFromR2(imgUrl)));
      }
      // 2. Set the new image as the only image (replacing the old ones)
      jobData.img = [req.file.location];
    } else if (jobData.img) {
      // 3. If no new image, but img field is provided (possible partial removal)
      // Check which images from the existing record are NOT in the incoming jobData.img
      const incomingImgs = Array.isArray(jobData.img) ? jobData.img : [jobData.img];
      
      const removedImgs = existingJob.img.filter(oldImg => !incomingImgs.includes(oldImg));
      
      if (removedImgs.length > 0) {
        console.log("🗑️ Deleting removed images:", removedImgs);
        await Promise.all(removedImgs.map(imgUrl => deleteFromR2(imgUrl)));
      }
      
      // Ensure jobData.img is correctly formatted as an array for the update
      jobData.img = incomingImgs.filter(url => url && url.trim() !== "");
    }

    // If title changed, update slug
    if (jobData.title) {
      const baseSlug = slugify(jobData.title, { lower: true });
      let slug = baseSlug;
      const existingWithSlug = await Job.findOne({ slug, _id: { $ne: req.params.id } });
      if (existingWithSlug) {
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
      }
      jobData.slug = slug;
    }

    // Ensure we don't try to update the _id field
    delete jobData._id;
    delete jobData.createdAt;
    delete jobData.updatedAt;

    // Invalidate ALL related caches immediately
    await invalidateJobCaches();
    await invalidateCache("jobs:staff:all");
    await invalidateCache("jobs:all");

    console.log("🔍 [UPDATE JOB] Searching for ID:", req.params.id);

    // 1. Try updating by ID using the jobData we prepared
    let updatedJob = await Job.findByIdAndUpdate(req.params.id, jobData, {
      new: true,
      runValidators: true
    });

    // 2. FALLBACK: If ID fails, try updating by slug
    if (!updatedJob && jobData.slug) {
      console.log("⚠️  [UPDATE JOB] ID not found, trying slug fallback:", jobData.slug);
      updatedJob = await Job.findOneAndUpdate({ slug: jobData.slug }, jobData, { new: true });
    }

    if (!updatedJob) {
      console.error("❌ [UPDATE JOB] 404: Job not found even with slug fallback");
      return res.status(404).json({ message: `Job not found. Please try refreshing the list.` });
    }

    // Final cache clear for the specific job to be absolutely sure
    await invalidateCache(`job:${updatedJob.slug}`);

    res.json(updatedJob);
  } catch (err) {
    console.error("❌ [UPDATE JOB ERROR]:", err);
    res.status(500).json({
      message: "Failed to update job",
      error: err.message,
      details: err.errors ? Object.keys(err.errors) : undefined
    });
  }
};

// DELETE JOB
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Delete images from R2
    if (job.img && job.img.length > 0) {
      console.log("🗑️ Deleting job images from R2:", job.img);
      await Promise.all(job.img.map(imgUrl => deleteFromR2(imgUrl)));
    }

    await Job.findByIdAndDelete(req.params.id);

    // Invalidate related caches
    await invalidateJobCaches();
    await invalidateCache(`job:${job.slug}`);
    await invalidateCache("jobs:staff:all");
    await invalidateCache("jobs:all");

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ message: "Failed to delete job" });
  }
};

// TOGGLE JOB STATUS (Active/Inactive)
exports.toggleJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    job.isActive = !job.isActive;
    await job.save();

    // Invalidate caches
    await invalidateJobCaches();
    await invalidateCache(`job:${job.slug}`);
    await invalidateCache("jobs:staff:all"); // Also clear staff cache

    res.json({ message: `Job ${job.isActive ? 'activated' : 'deactivated'} successfully`, job });
  } catch (err) {
    console.error("Error toggling job status:", err);
    res.status(500).json({ message: "Failed to toggle job status" });
  }
};