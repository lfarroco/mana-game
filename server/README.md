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

Base path `/api/v1`, JSON in/out. Every request must carry the player's id in
the `X-Player-Id` header (v1 identity; token auth replaces this later).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check → `{ ok: true }` (no auth) |
| POST | `/api/v1/sessions` | Create session → `SessionData` (409 if one exists) |
| GET | `/api/v1/sessions/current` | Resume/reconnect → `SessionData` (+ serialized `combatState` while in `combat`) |
| POST | `/api/v1/sessions/current/actions` | Dispatch action → `{ session, combatState? }` |
| DELETE | `/api/v1/sessions/current` | Abandon run → 204 |

### Create session body

```json
{
  "crystalId": "critical_crystal",
  "queueType": "ranked"          // optional: "casual" (default) | "ranked"
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

### Error responses

All errors are `{ "error": "<code>", "message": "..." }`:

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `invalid_player_id` | Missing/blank `X-Player-Id` |
| 400 | `invalid_crystal_id` | Missing/unknown `crystalId` |
| 400 | `invalid_queue_type` | `queueType` not `casual`/`ranked` |
| 400 | `invalid_action` / `invalid_action_type` | Malformed or unknown action |
| 404 | `no_active_session` | No session for this player |
| 409 | `session_already_exists` | A session is already active |
| 409 | `session_finished` | Run already ended (`victory`/`game_over`) |
| 422 | `action_rejected` | Action invalid for the current phase |
| 500 | `internal_error` | Unexpected server error |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `MANA_SERVER_HOST` | `127.0.0.1` | Bind address (use `0.0.0.0` in Docker/VPS) |
| `MANA_SERVER_PORT` | `8787` | Bind port |
| `MANA_CORS_ORIGIN` | `*` | Allowed CORS origin(s): `*` or a comma-separated list |
| `MANA_NODE_ENV` | `development` | Runtime environment |

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
- Guest auth (`POST /players`) is deferred; `X-Player-Id` is not a security
  token. Don't expose the server publicly until real auth lands.
- `clientActionId` is accepted for forward-compatibility but idempotent
  retries are not yet implemented.
