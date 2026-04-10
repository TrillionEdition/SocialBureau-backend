const redis = require("redis");

let isConnected = false;

// Create Redis client (redis v5.x)
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
        reconnectStrategy: (retries) => {
            // Don't attempt reconnect - just fail silently and use fallback
            if (retries > 3) return new Error("Max retries exceeded");
            return retries * 100;
        },
    },
});

// Only log on first error, not repeatedly
let errorLogged = false;

// Error handling - suppress spam
redisClient.on("error", (err) => {
    if (!errorLogged && process.env.REDIS_HOST) {
        console.warn("⚠️ Redis Client Error (will use in-memory cache fallback):", err.code);
        errorLogged = true;
    }
});

redisClient.on("connect", () => {
    isConnected = true;
    console.log("✅ Redis Connected");
});

// Try to connect Redis client (non-blocking)
redisClient.connect().catch((err) => {
    // Silently fail - in-memory cache will be used instead
    isConnected = false;
});

// In-memory fallback cache
const inMemoryCache = new Map();

// Async methods with fallback
const getAsync = async (key) => {
    try {
        if (isConnected) {
            return await redisClient.get(key);
        }
    } catch (err) {
        // Fall back to in-memory
    }
    return inMemoryCache.get(key) || null;
};

const setAsync = async (key, value) => {
    try {
        if (isConnected) {
            return await redisClient.set(key, value);
        }
    } catch (err) {
        // Fall back to in-memory
    }
    inMemoryCache.set(key, value);
};

const setexAsync = async (key, seconds, value) => {
    try {
        if (isConnected) {
            return await redisClient.setEx(key, seconds, value);
        }
    } catch (err) {
        // Fall back to in-memory
    }
    // Set in-memory with expiration
    inMemoryCache.set(key, value);
    setTimeout(() => inMemoryCache.delete(key), seconds * 1000);
};

const delAsync = async (keys) => {
    try {
        if (isConnected) {
            const keyArray = Array.isArray(keys) ? keys : [keys];
            return await redisClient.del(keyArray);
        }
    } catch (err) {
        // Fall back to in-memory
    }
    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach(key => inMemoryCache.delete(key));
};

const flushdbAsync = async () => {
    try {
        if (isConnected) {
            return await redisClient.flushDb();
        }
    } catch (err) {
        // Fall back to in-memory
    }
    inMemoryCache.clear();
};

module.exports = {
    redisClient,
    getAsync,
    setAsync,
    setexAsync,
    delAsync,
    flushdbAsync,
    isConnected: () => isConnected,
};