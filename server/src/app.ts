/**
 * Express application assembly.
 *
 * Dependencies are injectable (repo, CORS origin) so tests get isolated
 * state and the entry point controls runtime config.
 */

import express from "express";
import { sessionsRouter } from "./http/routes/sessions";
import { errorHandler } from "./http/middleware/errors";
import { corsMiddleware } from "./http/middleware/cors";
import { requestLogger } from "./http/middleware/logging";
import { createMemorySessionRepo } from "./persistence/memory";
import type { SessionRepo } from "./persistence/repositories";

export type AppDeps = {
  /** Session repository (defaults to a fresh in-memory repo). */
  repo?: SessionRepo;
  /** Allowed CORS origin(s): "*" or a comma-separated list. */
  corsOrigin?: string;
};

export function createApp(deps: AppDeps = {}): express.Express {
  const repo = deps.repo ?? createMemorySessionRepo();

  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use(corsMiddleware(deps.corsOrigin ?? "*"));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Session routes
  app.use("/api/v1/sessions", sessionsRouter(repo));

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
