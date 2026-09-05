/**
 * Shared Express-app factory for the Firebase Functions entry point.
 *
 * Split out of `functions.ts` so it can be unit-tested without loading the
 * `firebase-functions` SDK (whose dependency graph does not import under the
 * repo's jest ESM setup). Production behavior is identical to the VM entry
 * (`index.ts`): same config source, same `createApp` wiring.
 */

import type { Express } from "express";
import { createApp, type AppDeps } from "./app";
import { loadConfig } from "./config";
import { getFirestoreDb } from "./persistence/firestore";

let cachedApp: Express | null = null;

/** Build (once per instance) the Express app serving all API routes. */
export function getApiApp(deps: AppDeps = {}): Express {
  if (cachedApp) return cachedApp;
  const config = loadConfig();
  cachedApp = createApp({
    corsOrigin: config.corsOrigin,
    sqlitePath: config.sqlitePath ?? undefined,
    firestoreDb:
      deps.firestoreDb ??
      (config.firestoreProjectId
        ? getFirestoreDb(config.firestoreProjectId)
        : undefined),
    steam: { webApiKey: config.steamWebApiKey, appIds: config.steamAppIds },
    steamApiUrl: config.steamApiUrl,
    itch: config.itchEnabled,
    google:
      config.googleEnabled && config.googleClientId
        ? { clientId: config.googleClientId }
        : undefined,
    authRateLimitMax: config.authRateLimitMax,
    authRateLimitWindowMs: config.authRateLimitWindowMs,
    ...deps,
  });
  return cachedApp;
}

/** Test seam — drop the cached app so the next request rebuilds it. */
export function resetApiAppForTests(): void {
  cachedApp = null;
}
