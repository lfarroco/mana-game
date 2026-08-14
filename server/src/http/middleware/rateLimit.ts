/**
 * Per-IP rate limiting for abuse-prone endpoints (docs/auth.md "Security &
 * abuse": prevents ticket grinding on POST /auth/steam).
 *
 * The limiter is created per app instance (fresh in-memory store), so tests
 * get isolated state by passing small limits through createApp deps. 429
 * responses use the API's JSON error shape so clients can branch on the
 * machine-readable code (the global error handler never sees these).
 */

import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

/** Machine-readable code for rate-limited responses. */
export const RATE_LIMITED_ERROR = "rate_limited";

export type RateLimitOptions = {
  /** Max requests per window per IP (MANA_AUTH_RATE_LIMIT_MAX). */
  max: number;
  /** Window length in ms (MANA_AUTH_RATE_LIMIT_WINDOW_MS). */
  windowMs: number;
};

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: RATE_LIMITED_ERROR,
      message: "Too many requests — please try again later",
    },
  });
}
