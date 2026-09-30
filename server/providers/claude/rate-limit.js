import { makeOptInRateLimiter, clientKey } from '../common/rate-limit.js';

// Same lazy-build reasoning as openai/rate-limit.js: process.env is only
// populated with .env values after this module is imported, so the limiter
// must be constructed on first request, not at module load.
let _claudeRateLimiter;

/** Claude converse endpoint. Null = unlimited (default). */
function claudeRateLimiter() {
  if (_claudeRateLimiter === undefined)
    _claudeRateLimiter = makeOptInRateLimiter(
      process.env.GEV_RATELIMIT_CLAUDE_PER_MIN,
    );
  return _claudeRateLimiter;
}

/** Same contract as openai/rate-limit.js's enforceOptInRateLimit. */
function enforceOptInRateLimit(limiter, req, res) {
  if (!limiter) return true;
  if (limiter(clientKey(req))) return true;
  res.statusCode = 429;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Retry-After', '5');
  res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
  return false;
}

export { enforceOptInRateLimit, claudeRateLimiter };
