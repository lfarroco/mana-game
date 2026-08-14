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
  authRateLimitMax: config.authRateLimitMax,
  authRateLimitWindowMs: config.authRateLimitWindowMs,
});

const server = app.listen(config.port, config.host, () => {
  console.log(
    `[mana-server] listening on http://${config.host}:${config.port}`,
  );
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
