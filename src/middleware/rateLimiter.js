import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Max 100 Requests pro IP
  message: { error: "Zu viele Anfragen, bitte später erneut versuchen" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Max 5 Login-Versuche
  message: { error: "Zu viele Login-Versuche, bitte später erneut versuchen" },
  skipSuccessfulRequests: true
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 Minute
  max: 30, // Max 30 API Calls
  message: { error: "API Rate Limit erreicht" }
});