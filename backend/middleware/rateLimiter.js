// rateLimiter.js - Rate limiting middleware for AI endpoints

const rateLimit = require('express-rate-limit');

// Environment-based configuration with defaults
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (60 * 60 * 1000); // 1 hour default
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100; // 100 requests default

/**
 * Rate limiter for AI endpoints
 * Configurable via environment variables (defaults: 100 requests per hour per user)
 * Prevents abuse and runaway scripts while allowing generous legitimate use
 *
 * Environment Variables:
 * - RATE_LIMIT_WINDOW_MS: Window duration in milliseconds (default: 3600000 = 1 hour)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 100)
 * - NODE_ENV: Controls rate limit header visibility (production = hidden)
 *
 * Usage: Apply to AI endpoints that call Gemini API
 * Example: app.post('/api/generate-recipe', checkAuth, aiRateLimiter, async (req, res) => {...})
 */
const aiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,

  // Use Firebase UID as the key for per-user rate limiting
  keyGenerator: (req) => {
    // Fallback to IP if user not authenticated (shouldn't happen for protected routes)
    return req.user?.uid || req.ip;
  },

  // Custom error message
  message: {
    error: 'Too many AI requests',
    message: "You've reached the limit of 100 AI requests per hour. Please try again later.",
    retryAfter: '1 hour'
  },

  // Return 429 status code
  statusCode: 429,

  // Rate limit headers: Disabled in production to prevent attackers from monitoring limits
  // Enabled in development for debugging legitimate user experience
  standardHeaders: process.env.NODE_ENV !== 'production', // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers

  // Skip successful requests that don't consume resources
  skipSuccessfulRequests: false,

  // Skip failed requests
  skipFailedRequests: false,

  // Custom handler for when limit is exceeded
  handler: (req, res) => {
    req.log.warn({
      userId: req.user?.uid,
      ip: req.ip,
      path: req.path
    }, 'AI rate limit exceeded');

    res.status(429).json({
      error: 'Too many AI requests',
      message: "You've reached the limit of 100 AI requests per hour. Please try again later.",
      retryAfter: '1 hour'
    });
  }
});

module.exports = {
  aiRateLimiter
};
