/**
 * @file rateLimiter.middleware.js
 * @description Rate limiting configurations to protect against brute-force attacks and DDoS.
 * Specifically hardened for 4-digit PIN authentication endpoints.
 */

const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for Authentication & PIN endpoints.
 * Defends against brute-forcing the 4-digit PIN keyspace (10,000 combinations).
 * In development, allows 100 attempts; in production, 10 attempts per 15 minutes.
 * Crucially, skipSuccessfulRequests: true ensures valid logins do NOT count against the threshold.
 */
const isDev = process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: isDev ? 100 : parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  skipSuccessfulRequests: true, // Only failed PIN attempts consume the rate limit quota!
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many failed PIN attempts. Access temporarily throttled for security. Please try again in 15 minutes.',
    retryAfterMinutes: 15,
  },
});

/**
 * General API rate limiter for standard CRUD endpoints.
 */
const globalApiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: isDev ? 1000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this client. Please slow down.',
  },
});

module.exports = {
  authLimiter,
  globalApiLimiter,
};
