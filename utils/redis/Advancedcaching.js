/**
 * ADVANCED REDIS CACHING STRATEGIES
 * For implementing Redis across your entire website
 */

const { getAsync, setexAsync, delAsync, flushdbAsync } = require("../database/Redisconfig");
const { getCache, setCache } = require("../Cacheutils");

// ============================================
// 1. RATE LIMITING (Prevent API Abuse)
// ============================================

const rateLimit = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `ratelimit:${ip}`;
    const limit = 100; // 100 requests
    const windowSeconds = 60; // per minute

    const current = await getAsync(key);

    if (current && parseInt(current) >= limit) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: windowSeconds,
      });
    }

    const newCount = current ? parseInt(current) + 1 : 1;
    await setexAsync(key, windowSeconds, newCount);

    next();
  } catch (err) {
    console.error("Rate limit check failed:", err);
    next(); // Allow request if Redis fails
  }
};

// ============================================
// 2. SESSION MANAGEMENT
// ============================================

const storeSession = async (userId, sessionData, expirySeconds = 86400) => {
  // 24 hours by default
  const sessionKey = `session:${userId}`;
  await setCache(sessionKey, sessionData, expirySeconds);
  return sessionKey;
};

const getSession = async (userId) => {
  const sessionKey = `session:${userId}`;
  return await getCache(sessionKey);
};

const destroySession = async (userId) => {
  const sessionKey = `session:${userId}`;
  await delAsync(sessionKey);
};

// ============================================
// 3. USER DATA CACHING
// ============================================

const cacheUserProfile = async (userId, userData) => {
  const key = `user:${userId}`;
  await setCache(key, userData, 1800); // 30 minutes
};

const getUserProfile = async (userId) => {
  const key = `user:${userId}`;
  return await getCache(key);
};

const invalidateUserCache = async (userId) => {
  const key = `user:${userId}`;
  await delAsync(key);
};

// ============================================
// 4. SEARCH QUERY CACHING
// ============================================

const cacheSearchResults = async (query, results) => {
  const key = `search:${query.toLowerCase()}`;
  await setCache(key, results, 1800); // 30 minutes
};

const getSearchResults = async (query) => {
  const key = `search:${query.toLowerCase()}`;
  return await getCache(key);
};

// ============================================
// 5. PAGE/CONTENT CACHING
// ============================================

const cachePageContent = async (slug, content) => {
  const key = `page:${slug}`;
  await setCache(key, content, 3600); // 1 hour
};

const getPageContent = async (slug) => {
  const key = `page:${slug}`;
  return await getCache(key);
};

// ============================================
// 6. COUNTER/STATS CACHING
// ============================================

const incrementCounter = async (counterName) => {
  const key = `counter:${counterName}`;
  const current = await getAsync(key);
  const newValue = current ? parseInt(current) + 1 : 1;
  await setexAsync(key, 86400, newValue); // 24 hours
  return newValue;
};

const getCounter = async (counterName) => {
  const key = `counter:${counterName}`;
  const value = await getAsync(key);
  return value ? parseInt(value) : 0;
};

// Example: Track job views
const trackJobView = async (jobSlug) => {
  return await incrementCounter(`job_views:${jobSlug}`);
};

const getJobViewCount = async (jobSlug) => {
  return await getCounter(`job_views:${jobSlug}`);
};

// ============================================
// 7. EMAIL VERIFICATION CODES
// ============================================

const storeVerificationCode = async (email, code, expirySeconds = 600) => {
  // 10 minutes by default
  const key = `verification:${email}`;
  await setexAsync(key, expirySeconds, code);
};

const getVerificationCode = async (email) => {
  const key = `verification:${email}`;
  return await getAsync(key);
};

const removeVerificationCode = async (email) => {
  const key = `verification:${email}`;
  await delAsync(key);
};

// ============================================
// 8. CACHE WARMING (Pre-load data)
// ============================================

const warmCache = async () => {
  try {
    console.log("🔥 Warming cache...");

    // Pre-load all active jobs
    const Job = require("../models/JobModel");
    const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });
    await setCache("jobs:all", jobs, 3600);

    console.log(`✅ Warmed cache with ${jobs.length} jobs`);
  } catch (err) {
    console.error("Cache warming failed:", err);
  }
};

// Call this when server starts
// warmCache();

// ============================================
// 9. CACHE STATS/MONITORING
// ============================================

class CacheStats {
  constructor() {
    this.hits = 0;
    this.misses = 0;
  }

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : ((this.hits / total) * 100).toFixed(2);
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: `${this.getHitRate()}%`,
      total: this.hits + this.misses,
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
  }
}

const cacheStats = new CacheStats();

// ============================================
// 10. CACHE INVALIDATION PATTERNS
// ============================================

/**
 * Invalidate multiple related caches at once
 * Useful for cascade updates
 */
const invalidateCascade = async (patterns) => {
  // patterns: ["jobs:*", "search:*", "page:careers"]
  for (const pattern of patterns) {
    // Note: This requires Redis 6.0+ with SCAN
    // For simplicity, just delete specific keys
    await delAsync(pattern);
  }
};

/**
 * Clear all caches (use with caution!)
 */
const clearAllCaches = async () => {
  try {
    await flushdbAsync();
    console.log("🗑️  All caches cleared!");
  } catch (err) {
    console.error("Failed to clear caches:", err);
  }
};

module.exports = {
  // Rate Limiting
  rateLimit,

  // Session Management
  storeSession,
  getSession,
  destroySession,

  // User Data
  cacheUserProfile,
  getUserProfile,
  invalidateUserCache,

  // Search
  cacheSearchResults,
  getSearchResults,

  // Pages
  cachePageContent,
  getPageContent,

  // Counters
  incrementCounter,
  getCounter,
  trackJobView,
  getJobViewCount,

  // Verification
  storeVerificationCode,
  getVerificationCode,
  removeVerificationCode,

  // Cache Management
  warmCache,
  invalidateCascade,
  clearAllCaches,

  // Monitoring
  CacheStats,
  cacheStats,
};