// rateLimiter.js - Rate limiting middleware for AI endpoints

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for AI endpoints
 * Limits requests to 100 per hour per user (based on Firebase UID)
 * Prevents abuse and runaway scripts while allowing generous legitimate use
 *
 * Usage: Apply to AI endpoints that call Gemini API
 * Example: app.post('/api/generate-recipe', checkAuth, aiRateLimiter, async (req, res) => {...})
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // Limit each user to 100 requests per hour

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

  // Standard headers for rate limit info
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
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
