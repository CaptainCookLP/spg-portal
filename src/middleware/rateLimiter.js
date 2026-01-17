import rateLimit from "express-rate-limit";

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const rateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100);
const loginRateLimitWindowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const loginRateLimitMaxAttempts = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5);
const apiRateLimitWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60 * 1000);
const apiRateLimitMaxRequests = Number(process.env.API_RATE_LIMIT_MAX_REQUESTS || 30);

export const rateLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMaxRequests,
  message: { error: "Zu viele Anfragen, bitte später erneut versuchen" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

export const loginRateLimiter = rateLimit({
  windowMs: loginRateLimitWindowMs,
  max: loginRateLimitMaxAttempts,
  message: { error: "Zu viele Login-Versuche, bitte später erneut versuchen" },
  skipSuccessfulRequests: true
});

export const apiRateLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  max: apiRateLimitMaxRequests,
  message: { error: "API Rate Limit erreicht" }
});