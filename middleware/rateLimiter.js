const ApiResponse = require('../utils/ApiResponse');

const attempts = new Map();

const cleanupExpiredEntries = () => {
  const now = Date.now();

  for (const [key, entry] of attempts.entries()) {
    if (entry.resetAt <= now) {
      attempts.delete(key);
    }
  }
};

const createRateLimiter = ({ windowMs, maxAttempts, message }) => {
  return (req, res, next) => {
    const isLocalDevRequest =
      process.env.NODE_ENV !== 'production' ||
      req.hostname === 'localhost' ||
      req.ip === '::1' ||
      req.ip === '127.0.0.1';

    if (isLocalDevRequest) {
      return next();
    }

    cleanupExpiredEntries();

    const key = `${req.ip}:${req.originalUrl}`;
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || entry.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return ApiResponse.error(res, message, 429);
    }

    entry.count += 1;
    attempts.set(key, entry);
    return next();
  };
};

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

module.exports = {
  createRateLimiter,
  loginRateLimiter,
};