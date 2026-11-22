import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

// handed to the error middleware, so the 429 keeps the standard JSON shape
const tooMany = (req, res, next) =>
  next(
    Object.assign(new Error("Too many requests, please try again later"), {
      status: 429,
      code: "RATE_LIMITED",
    }),
  );

// strict limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: tooMany,
});

// general limiter for the whole API
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
});
