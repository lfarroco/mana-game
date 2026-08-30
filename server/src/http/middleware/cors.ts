/**
 * CORS middleware.
 *
 * Allowed origins come from config (MANA_CORS_ORIGIN): "*" or a
 * comma-separated list. Applies CORS headers and answers preflight OPTIONS
 * so the Phaser client (browser dev server / Electron / Capacitor) can call
 * the API cross-origin.
 */

import type { Request, Response, NextFunction } from "express";

export function corsMiddleware(allowedOrigins: string) {
  const origins = allowedOrigins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.header("Origin");
    const allowAll = origins.includes("*");
    const allowed =
      origin !== undefined && (allowAll || origins.includes(origin));

    if (allowAll) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
