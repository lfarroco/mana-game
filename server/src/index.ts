/**
 * Server entry point.
 */

import { createApp } from "./app";
import { loadConfig } from "./config";

const config = loadConfig();

const app = createApp({
  corsOrigin: config.corsOrigin,
  sqlitePath: config.sqlitePath ?? undefined,
  steam: { webApiKey: config.steamWebApiKey, appIds: config.steamAppIds },
  steamApiUrl: config.steamApiUrl,
  authRateLimitMax: config.authRateLimitMax,
  authRateLimitWindowMs: config.authRateLimitWindowMs,
});

const server = app.listen(config.port, config.host, () => {
  console.log(
    `[mana-server] listening on http://${config.host}:${config.port}`,
  );
  if (config.steamWebApiKey) {
    console.log(
      `[mana-server] Steam auth enabled (endpoint: ${config.steamApiUrl}, app ids: ${config.steamAppIds.join(",")})`,
    );
  } else {
    console.log(
      "[mana-server] Steam auth DISABLED — set MANA_STEAM_WEB_API_KEY to register POST /api/v1/auth/steam",
    );
  }
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[mana-server] received ${signal}, shutting down...`);
  server.close(() => {
    console.log("[mana-server] closed");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
