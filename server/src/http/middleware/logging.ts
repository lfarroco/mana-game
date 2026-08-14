/**
 * Minimal per-request logging for ops (every request + status + latency).
 */

import type { Request, Response, NextFunction } from "express";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    const playerId = req.playerId ?? "-";
    console.log(
      `[req] ${req.method} ${req.originalUrl} player=${playerId} -> ${res.statusCode} (${ms}ms)`,
    );
  });
  next();
}
