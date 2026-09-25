const { rateLimit, MemoryStore } = require("express-rate-limit");
const { redisClient, isConnected } = require("../database/Redisconfig");

// Store backed by the app's existing Redis client so limits stay consistent
// across multiple instances. Falls back to an in-process MemoryStore whenever
// Redis is unavailable, mirroring the fallback pattern used in Redisconfig.js.
class RedisRateLimitStore {
  constructor(prefix = "rl:") {
    this.prefix = prefix;
    this.fallback = new MemoryStore();
  }

  init(options) {
    this.windowMs = options.windowMs;
    this.fallback.init(options);
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  async increment(key) {
    if (!isConnected()) return this.fallback.increment(key);
    try {
      const redisKey = this._key(key);
      const totalHits = await redisClient.incr(redisKey);
      if (totalHits === 1) {
        await redisClient.pExpire(redisKey, this.windowMs);
      }
      const ttl = await redisClient.pTTL(redisKey);
      const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs));
      return { totalHits, resetTime };
    } catch (err) {
      return this.fallback.increment(key);
    }
  }

  async decrement(key) {
    if (!isConnected()) return this.fallback.decrement(key);
    try {
      await redisClient.decr(this._key(key));
    } catch (err) {
      // ignore, counter will simply expire naturally
    }
  }

  async resetKey(key) {
    if (!isConnected()) return this.fallback.resetKey(key);
    try {
      await redisClient.del(this._key(key));
    } catch (err) {
      // ignore
    }
  }
}

// Global limiter: applied to every request.
const apiLimiter = rateLimit({
  store: new RedisRateLimitStore("rl:api:"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Stricter limiter for login/auth endpoints to slow down credential stuffing/brute force.
const loginLimiter = rateLimit({
  store: new RedisRateLimitStore("rl:login:"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many login attempts, please try again later." },
});

module.exports = { apiLimiter, loginLimiter, RedisRateLimitStore };
