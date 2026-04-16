const { getAsync, setexAsync, delAsync } = require("../database/Redisconfig");

// Cache configuration
const CACHE_EXPIRY = {
    JOBS_LIST: 3600, // 1 hour for all jobs list
    SINGLE_JOB: 7200, // 2 hours for single job
    SEARCH_RESULTS: 1800, // 30 minutes for search results
    USER_DATA: 1800, // 30 minutes for user data
};

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Cached data or null
 */
const getCache = async (key) => {
    try {
        const cachedData = await getAsync(key);
        if (cachedData) {
            // Silently return cached data (no logging spam)
            return JSON.parse(cachedData);
        }
        return null;
    } catch (err) {
        // Silently fail, let request proceed normally
        return null;
    }
};

/**
 * Set data in cache with expiry
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} expiry - Expiry time in seconds
 * @returns {Promise<void>}
 */
const setCache = async (key, data, expiry = CACHE_EXPIRY.JOBS_LIST) => {
    try {
        const jsonData = JSON.stringify(data);
        await setexAsync(key, expiry, jsonData);
        // Silently cache (no logging spam)
    } catch (err) {
    }
};

/**
 * Invalidate (delete) cache key
 * @param {string|string[]} keys - Single key or array of keys to delete
 * @returns {Promise<void>}
 */
const invalidateCache = async (keys) => {
    try {
        await delAsync(keys);
    } catch (err) {
        // Silently fail
    }
};

/**
 * Invalidate all job-related caches
 * Used when a job is created, updated, or deleted
 */
const invalidateJobCaches = async () => {
    const keysToInvalidate = [
        "jobs:all",
        "jobs:active",
    ];

    await invalidateCache(keysToInvalidate);
};

module.exports = {
    getCache,
    setCache,
    invalidateCache,
    invalidateJobCaches,
    CACHE_EXPIRY,
};
