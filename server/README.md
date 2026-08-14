# Mana Battle — Game Server

Authoritative multiplayer game server for Mana Battle.

## Quick Start

```bash
cd server
npm install
npm run dev        # http://127.0.0.1:8787
npm run test       # jest unit + integration tests
npm run typecheck  # tsc --noEmit
npm run build      # tsup production bundle → dist/
```

## API (v1)

Base path `/api/v1`, JSON in/out. Every session request must carry a bearer
token in the `Authorization` header — obtain one via `POST /api/v1/auth/steam`
(Steam auto-login, Electron) which returns `{ player, token }`:

```
Authorization: Bearer <token>
```

Unauthenticated: `GET /health`, `POST /api/v1/auth/steam`. Everything else
requires a valid (non-expired) token; missing/malformed tokens → 401
`missing_token`, unknown/expired tokens → 401 `invalid_token`. The `X-Player-Id`
header is retired.

| Method | Path                               | Description                                                                     |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/health`                          | Liveness check → `{ ok: true }` (no auth)                                       |
| POST   | `/api/v1/auth/steam`               | Steam ticket → `{ player, token }` (no auth)                                    |
| POST   | `/api/v1/sessions`                 | Create session → `SessionData` (409 if one exists)                              |
| GET    | `/api/v1/sessions/current`         | Resume/reconnect → `SessionData` (+ serialized `combatState` while in `combat`) |
| POST   | `/api/v1/sessions/current/actions` | Dispatch action → `{ session, combatState? }`                                   |
| DELETE | `/api/v1/sessions/current`         | Abandon run → 204                                                               |

### Create session body

```json
{
  "crystalId": "critical_crystal",
  "queueType": "ranked" // optional: "casual" (default) | "ranked"
}
```

- `crystalId` is **required** — every run starts with a core crystal. The id
  must be a known core card id (`mana_crystal`, `critical_crystal`,
  `protective_crystal`, `growth_crystal`, `purple_crystal`, …).
- The server generates the session seed (it is the replay authority) and marks
  the session as `session_type: { type: "multiplayer", queueType }`.
- One active session per player: creating a second returns **409** (abandon the
  current run with `DELETE /sessions/current` first).
- Actions on a finished session (`victory` / `game_over`) return **409**.

### Dispatch action body

```json
{
  "action": { "type": "start_combat" },
  "clientActionId": "optional-idempotency-key"
}
```

Supported action types: `skip`, `select_encounter`, `recruit_unit`,
`discard_unit`, `update_team`, `apply_orb`, `increase_core_max_life`,
`upgrade_core_power`, `decrease_core_cooldown`, `start_combat`, `end_combat`,
`victory`.

`start_combat` runs the combat simulation server-side and returns the result as
a JSON-safe `CombatStateDto` (`units`, `logs`, `wonCombat`,
`finalPlayerUnits`, `enemyPlayerName`) — the raw in-memory `CombatState`
(contains a `Map`) is never sent. The client decodes it with the core
`CombatCodec`.

## Matchmaking & rating

Async "ghost" PvP (docs/game-server.md) — no real-time coordination, opponents
always available:

- **Ghost snapshot** — every `start_combat` snapshots the player's board team
  as a ghost for the current round (`{ playerId, sessionId, round, team,
  rating, createdAt }`). Teams are sanitized at snapshot time (positions
  clamped to the 3×3 board, CPU force, full life) so they are always
  combat-ready when picked.
- **Opponent pick** — the closest-rated ghost of the same round within a
  rating band (start ±150), widening by +150 per miss (up to 3 steps).
  Self and recently-fought players are excluded; the recently-fought log is a
  capped per-player FIFO (20) on the ghost repo. Picks are deterministic
  (closest rating, then lowest rating, then player id).
- **PvE fallback** — when no ghost qualifies, the enemy is generated via
  `EnemyGeneration.generateEnemyTeamForRound(round, wins, seed)` and the
  `enemyPlayerName` is `"PvE"` — a match is always guaranteed.
- **Matchup record** — each `start_combat` action-log entry carries a
  `payload: { enemyPlayerName, ghostId, opponentPlayerId }` (nulls = PvE), so
  the session log doubles as the run's matchup history.
- **Rating** — players start at 1000 (initialized on first session creation).
  On run completion (`victory` / `game_over`) a wins-based delta is applied
  exactly once: gold 6 (10+ wins), silver 4 (8–9), bronze 2 (5–7), otherwise 1
  (ported from the retired Supabase `multiplayer-rating.ts`).

### Error responses

All errors are `{ "error": "<code>", "message": "..." }`:

| Status | Code                                        | Meaning                                             |
| ------ | ------------------------------------------- | --------------------------------------------------- |
| 400    | `invalid_crystal_id`                        | Missing/unknown `crystalId`                         |
| 400    | `invalid_queue_type`                        | `queueType` not `casual`/`ranked`                   |
| 400    | `invalid_action` / `invalid_action_type`    | Malformed or unknown action                         |
| 400    | `invalid_steam_ticket` / `invalid_identity` | Malformed steam auth body                           |
| 401    | `missing_token`                             | Missing/malformed `Authorization` header            |
| 401    | `invalid_token`                             | Unknown or expired bearer token                     |
| 401    | `invalid_steam_ticket` / `invalid_identity` | Steam rejected the ticket / wrong identity or appId |
| 404    | `no_active_session`                         | No session for this player                          |
| 409    | `session_already_exists`                    | A session is already active                         |
| 409    | `session_finished`                          | Run already ended (`victory`/`game_over`)           |
| 422    | `action_rejected`                           | Action invalid for the current phase                |
| 429    | `rate_limited`                              | Per-IP auth rate limit exceeded (POST /auth/steam)  |
| 500    | `internal_error`                            | Unexpected server error                             |

## Environment

| Variable                 | Default       | Description                                                       |
| ------------------------ | ------------- | ----------------------------------------------------------------- |
| `MANA_SERVER_HOST`       | `127.0.0.1`   | Bind address (use `0.0.0.0` in Docker/VPS)                        |
| `MANA_SERVER_PORT`       | `8787`        | Bind port                                                         |
| `MANA_CORS_ORIGIN`       | `*`           | Allowed CORS origin(s): `*` or a comma-separated list             |
| `MANA_NODE_ENV`          | `development` | Runtime environment                                               |
| `MANA_STEAM_WEB_API_KEY` | —             | Publisher Web API key (server secret; enables `POST /auth/steam`) |
| `MANA_STEAM_APP_IDS`     | `3757600`     | Comma-separated Steam app-id allowlist                            |
| `MANA_TOKEN_TTL_DAYS`    | `30`          | Bearer token lifetime (days)                                      |
| `MANA_AUTH_RATE_LIMIT_MAX` | `20`        | Per-IP request cap per window for `POST /auth/steam`              |
| `MANA_AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window (ms) for `POST /auth/steam`              |

## Deployment (DigitalOcean VM)

The `Dockerfile` bundles the server **and** the `core/` game logic into a single
image (core is inlined at build time via the `@game/*` esbuild alias).

```bash
# from the repo root
docker build -f server/Dockerfile -t mana-server .

# run (port 8787 exposed)
docker run -d --name mana-server -p 8787:8787 \
  -e MANA_SERVER_HOST=0.0.0.0 \
  -e MANA_CORS_ORIGIN="https://your-app.example" \
  mana-server

# health check
curl http://127.0.0.1:8787/health
```

Notes:

- v1 persistence is **in-memory** — restarts lose active sessions. Durable
  SQLite persistence is planned (Phase 4).
- Auth: Steam-only (`POST /api/v1/auth/steam`); bearer tokens are stored
  SHA-256-hashed with an expiry. The auth endpoint is rate-limited per-IP
  (`express-rate-limit`, `MANA_AUTH_RATE_LIMIT_MAX` / window) to prevent ticket
  grinding. Guest accounts are a future phase.
- `clientActionId` is accepted for forward-compatibility but idempotent
  retries are not yet implemented.
