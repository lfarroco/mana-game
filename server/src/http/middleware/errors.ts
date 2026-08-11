/**
 * Global error-handling middleware.
 *
 * Maps typed ApiErrors to their status/code; anything else becomes a 500.
 */

import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../errors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  console.error("[server] Unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: "internal_error", message });
}
