# Logging System

## Overview

Mana Battle uses a structured logger utility at `phaser/src/Utils/Logger.ts`.

The logger standardizes log shape and supports log levels:
- `debug`
- `info`
- `warn`
- `error`

Each log event includes:
- `ts` (ISO timestamp)
- `level`
- `scope` (module name)
- `message`
- optional `meta`

## Usage

Create a scoped logger in each module:

```ts
import { createLogger } from "@Utils/Logger";

const logger = createLogger("AudioManager");

logger.debug("Sound effect on cooldown", { soundKey, cooldownMs: 1000 });
logger.info("Playing music", { musicKey, loop });
logger.warn("Steamworks not available");
logger.error("Failed to fetch profile", { playerId, error });
```

## Log Level Resolution

Log level is resolved in this order:
1. `setLogLevel(...)` runtime override
2. `process.env.LOG_LEVEL`
3. `localStorage["mana_log_level"]`
4. Default: `warn` in production, `debug` otherwise

## Electron Integration

When available, logs are also forwarded to an optional Electron sink:
- `window.electronLogger.log(level, payload)`

If this sink is missing or fails, gameplay is unaffected.

## Conventions

- Use `debug` for high-frequency events and verbose traces.
- Use `info` for lifecycle and state transitions.
- Use `warn` for recoverable issues and fallbacks.
- Use `error` for failures that impact expected behavior.
- Prefer structured `meta` objects over string interpolation for context.
