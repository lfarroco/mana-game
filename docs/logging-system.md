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

The module exports `debug`, `info`, `warn`, and `error` functions directly — no
instance creation required. The **first argument is always the context**
(module/scope name), followed by the message and an optional `meta` object:

```ts
import * as Logger from "@Utils/Logger";

Logger.debug("AudioManager", "Sound effect on cooldown", { soundKey, cooldownMs: 1000 });
Logger.info("AudioManager", "Playing music", { musicKey, loop });
Logger.warn("AudioManager", "Steamworks not available");
Logger.error("AudioManager", "Failed to fetch profile", { playerId, error });
```

In test environments (when `process.env.JEST_WORKER_ID` is set or
`process.env.NODE_ENV === "test"`) every logger function is a **no-op** and
never writes to the console or touches browser/Electron globals.

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
