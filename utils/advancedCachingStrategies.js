const { getAsync, setexAsync, delAsync, isConnected } = require("../database/Redisconfig");
const { getCache, setCache } = require("./cacheUtils");

// In-memory rate limit store (fallback when Redis is down)
const inMemoryRateLimit = new Map();

/**
 * Simple rate limiter middleware
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 */
const rateLimit = (maxRequests = 100, windowMs = 60000) => {
    return async (req, res, next) => {
        try {
            const key = `ratelimit:${req.ip}`;
            let isLimited = false;

            // Check in-memory store (works with or without Redis)
            if (inMemoryRateLimit.has(key)) {
                const data = inMemoryRateLimit.get(key);
                if (data.count >= maxRequests) {
                    isLimited = true;
                } else {
                    data.count += 1;
                }
            } else {
                inMemoryRateLimit.set(key, {
                    count: 1,
                    expireAt: Date.now() + windowMs,
                });
                // Clean up expired entries
                setTimeout(() => {
                    if (inMemoryRateLimit.has(key)) {
                        inMemoryRateLimit.delete(key);
                    }
                }, windowMs);
            }

            if (isLimited) {
                return res.status(429).json({
                    message: "Too many requests, please try again later",
                });
            }

            res.set("X-RateLimit-Limit", maxRequests);
            const remaining = maxRequests - (inMemoryRateLimit.get(key)?.count || 0);
            res.set("X-RateLimit-Remaining", Math.max(0, remaining));
            next();
        } catch (err) {
            // On error, just continue (don't block requests)
            next();
        }
    };
};

/**
 * Warm up cache with commonly accessed data
 * @param {Array} dataSources - Array of data to pre-load into cache
 */
const warmCache = async (dataSources = []) => {
    try {
        for (const { key, data, expiry } of dataSources) {
            await setCache(key, data, expiry);
        }
    } catch (err) {
        // Silently fail
    }
};

/**
 * Get cache statistics from Redis
 * @returns {Promise<Object>} Cache statistics
 */
const cacheStats = async () => {
    try {
        return {
            cacheType: isConnected()  ? "Redis" : "In-Memory",
            timestamp: new Date(),
            inMemorySize: inMemoryRateLimit.size,
        };
    } catch (err) {
        return { error: err.message };
    }
};

/**
 * Clear all caches from Redis
 * @returns {Promise<void>}
 */
const clearAllCaches = async () => {
    try {
        await delAsync(Array.from(inMemoryRateLimit.keys()));
        inMemoryRateLimit.clear();
    } catch (err) {
        // Silently fail
    }
};

module.exports = {
    rateLimit,
    warmCache,
    cacheStats,
    clearAllCaches,
};
