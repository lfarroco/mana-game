/**
 * Express application assembly.
 */

import express from "express";
import { sessionsRouter } from "./http/routes/sessions";
import { errorHandler } from "./http/middleware/errors";

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Session routes
  app.use("/api/v1/sessions", sessionsRouter);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
