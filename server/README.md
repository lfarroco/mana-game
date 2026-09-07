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

## Local multiplayer testing (Steam flow)

One-command local setup for the multiplayer + Steam auth flow — no deploy
needed. The only external call is your server → Steam's `AuthenticateUserTicket`
Web API, which works fine from localhost with your publisher key.

```bash
# 1. From the repo root, create a .env (gitignored) with your publisher key:
echo 'MANA_STEAM_WEB_API_KEY=<your-key>' > .env

# 2. Run the server (dev loop, SQLite-backed, Steam auth enabled):
make server-mp        # Ctrl-C to stop
```

- **URL**: `http://127.0.0.1:8787` — the Steam Electron client's default
  `MANA_SERVER_URL`, so no client config is needed on the same machine.
- **Persistence**: SQLite at `server/data/mana.db` (default), so sessions,
  ghosts, and ratings survive server restarts and accumulate across test
  players — restart-survival and cross-account ghost matchmaking are
  testable locally.
- **Overrides**: same `.env` also supports `MANA_SERVER_PORT`,
  `MANA_STEAM_APP_IDS` (default `3757600,4233280`), `MANA_SQLITE_PATH`.

Then launch the **Steam Electron build** and click **MULTIPLAYER** on the
title screen. For ghost-PvP, play a few rounds as a second Steam account on
the same server (your own ghosts are excluded from matchmaking, so one
account always fights PvE).

## API (v1)

Base path `/api/v1`, JSON in/out. Every session request must carry a bearer
token in the `Authorization` header — obtain one via `POST /api/v1/auth/steam`
(Steam auto-login, Electron), `POST /api/v1/auth/itch` (itch.io OAuth, web
build), `POST /api/v1/auth/google` (Google sign-in), or
`POST /api/v1/auth/guest` (instant guest play, no credential), all of which
return `{ player, token }`:

```
Authorization: Bearer <token>
```

Unauthenticated: `GET /health`, `POST /api/v1/auth/steam`,
`POST /api/v1/auth/itch`, `POST /api/v1/auth/google`, `POST /api/v1/auth/guest`.
Everything else requires a valid (non-expired) token;
missing/malformed tokens → 401 `missing_token`, unknown/expired tokens → 401
`invalid_token`. The `X-Player-Id` header is retired.

| Method | Path                               | Description                                                                     |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/health`                          | Liveness check → `{ ok: true }` (no auth)                                       |
| POST   | `/api/v1/auth/steam`               | Steam ticket → `{ player, token }` (no auth)                                    |
| POST   | `/api/v1/auth/itch`                | itch.io OAuth token → `{ player, token }` (no auth; gated by `MANA_ITCH_ENABLED`) |
| POST   | `/api/v1/auth/google`              | Google OIDC ID token → `{ player, token }` (no auth; gated by `MANA_GOOGLE_ENABLED` + `MANA_GOOGLE_CLIENT_ID`) |
| POST   | `/api/v1/auth/guest`               | Guest play → `{ player, token }` (no auth, never gated; optional `{ displayName? }`, otherwise a random `AdjectiveNounNN` handle) |
| POST   | `/api/v1/players/me/convert`       | Guest → itch/google link (`{ provider, token? / idToken? }` → `{ player }`; 409 when the provider account is already linked) |
| GET    | `/oauth/callback`                  | OAuth relay page for the Android login flows (no auth) — see [docs/android-multiplayer.md](../docs/android-multiplayer.md) |
| POST   | `/api/v1/sessions`                 | Create session → `SessionData` (409 if an **active** run exists)                |
| GET    | `/api/v1/sessions/current`         | Resume/reconnect → `SessionData` (+ serialized `combatState` while in `combat`); 404 if none or the run has finished |
| POST   | `/api/v1/sessions/current/actions` | Dispatch action → `{ session, combatState? }`                                   |

### Session lifecycle (server-owned)

The **server** decides when a session finishes — the client never does, and
there is **no `DELETE /sessions/current`** endpoint.

- A run finishes when core transitions it to a terminal phase: `end_combat`
  with `losses >= LOSSES_TO_GAME_OVER` → `game_over` (0 lives left), or
  `wins >= WINS_TO_WIN_GAME` → `victory`.
- The terminal session is returned **once**, in the action response of the
  `end_combat` that ended the run — the client renders the game-over/victory
  screen from that payload.
- From then on the run is finished: `GET /sessions/current` → 404
  `no_active_session`, further actions → 409 `session_finished`, and
  `POST /sessions` succeeds again (the finished run is superseded — the player
  can only create a new session).

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
- One active session per player: creating a second returns **409** while a
  run is still active. A finished run (`victory` / `game_over`) does **not**
  block a new session — the server owns the lifecycle and supersedes it (see
  [Session lifecycle (server-owned)](#session-lifecycle-server-owned)).
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
| 400    | `invalid_steam_ticket` / `invalid_itch_token` / `invalid_identity` | Malformed auth body |
| 401    | `missing_token`                             | Missing/malformed `Authorization` header            |
| 401    | `invalid_token`                             | Unknown or expired bearer token                     |
| 401    | `invalid_steam_ticket` / `invalid_itch_token` / `invalid_identity` | Provider rejected the credential (Steam ticket / itch token / identity or appId) |
| 404    | `no_active_session`                         | No session for this player                          |
| 409    | `session_already_exists`                    | A session is already active                         |
| 409    | `session_finished`                          | Run already ended (`victory`/`game_over`)           |
| 422    | `action_rejected`                           | Action invalid for the current phase                |
| 429    | `rate_limited`                              | Per-IP auth rate limit exceeded (`POST /auth/*`)  |
| 403    | `guest_cannot_rename` / `not_a_guest`       | Guests cannot rename; only guests can convert      |
| 409    | `account_already_linked`                    | Provider account already linked to another player  |
| 400    | `provider_not_enabled`                      | Convert target's login is disabled on this server  |
| 500    | `internal_error`                            | Unexpected server error                             |

## Environment

| Variable                 | Default       | Description                                                       |
| ------------------------ | ------------- | ----------------------------------------------------------------- |
| `MANA_SERVER_HOST`       | `127.0.0.1`   | Bind address (use `0.0.0.0` in Docker/VPS)                        |
| `MANA_SERVER_PORT`       | `8787`        | Bind port                                                         |
| `MANA_CORS_ORIGIN`       | `*`           | Allowed CORS origin(s): `*` or a comma-separated list             |
| `MANA_NODE_ENV`          | `development` | Runtime environment                                               |
| `MANA_STEAM_WEB_API_KEY` | —             | Steam Web API key (standard or publisher; server secret; enables `POST /auth/steam`) |
| `MANA_STEAM_APP_IDS`     | `3757600`     | Comma-separated Steam app-id allowlist                            |
| `MANA_STEAM_API_URL`     | public endpoint | `AuthenticateUserTicket` endpoint. The server code defaults to `https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/` (needs a **publisher** key), but `.env.example` sets `https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/` so a standard Web API key (`steamcommunity.com/dev/apikey`) works (rate-limited). Override in `.env` to switch. |
| `MANA_ITCH_ENABLED`      | `false`        | `true` registers `POST /api/v1/auth/itch` (web build's itch.io OAuth login) |
| `MANA_GOOGLE_ENABLED`    | `false`        | `true` registers `POST /api/v1/auth/google` (Android build's Google sign-in) |
| `MANA_GOOGLE_CLIENT_ID`  | —             | Public Google OAuth client id; the server rejects ID tokens whose `aud` does not match — see [docs/android-multiplayer.md](../docs/android-multiplayer.md) |
| `MANA_TOKEN_TTL_DAYS`    | `30`          | Bearer token lifetime (days)                                      |
| `MANA_AUTH_RATE_LIMIT_MAX` | `20`        | Per-IP request cap per window for the auth endpoints (`POST /auth/steam`, `POST /auth/itch`) |
| `MANA_AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window (ms) for the auth endpoints              |
| `MANA_SQLITE_PATH`     | —             | Opt into durable SQLite persistence (a database file path or `:memory:`); unset = in-memory repos |
| `MANA_FIRESTORE_PROJECT_ID` | —          | Opt into Firestore persistence (the Firebase backend — wins over SQLite when both are set); unset = SQLite/memory selection |

## Persistence

Persistence is behind repository interfaces (`src/persistence/repositories.ts`,
all async) with three implementations: in-memory (`memory.ts`, the
**default**), durable SQLite via `better-sqlite3` (`sqlite.ts`), and
Firestore (`firestore.ts` — selected by `MANA_FIRESTORE_PROJECT_ID`, the
Firebase backend; wins over SQLite when both are set).

**Selection logic**: set `MANA_SQLITE_PATH` to a database file path (parent
directory is auto-created, WAL journaling enabled) or `:memory:` to boot all
five repos on SQLite. When unset, the server uses the in-memory repos
(existing behavior — restarting loses active sessions). `createApp` accepts a
`sqlitePath` dep (individual `*Repo` deps override the SQLite default per
repo), and `src/index.ts` wires `config.sqlitePath`.

```
MANA_SQLITE_PATH=./data/mana.db npm start   # durable file-backed persistence
MANA_SQLITE_PATH=:memory: npm start          # throwaway in-memory SQLite
npm start                                    # in-memory repos (default)
```

Schema (idempotent `CREATE TABLE IF NOT EXISTS`, created on boot):
`players`, `tokens`, `sessions` (`SessionData` as JSON), `combat_states`
(`CombatStateDto` via the core `CombatCodec` — the live `SessionData.combatState`
carries a `Map` that plain JSON cannot hold, so it is stored separately and
re-attached on load), `ghosts` + `recently_fought` (capped FIFO), `ratings`,
`run_completions`, `idempotency` (write-once `clientActionId` retry store).
Session + combat rows are written in a single transaction; a kill/restart
mid-run resumes via `GET /sessions/current` with the combat state intact
(restart-survival test in `test/sqlite.test.ts`). The Firestore backend
(`MANA_FIRESTORE_PROJECT_ID`) mirrors this shape as collections — see
`src/persistence/firestore.ts` and `docs/firebase-backend.md`.

## Deployment (Cloud Functions + Firestore)

Production is the Firebase backend ([docs/firebase-backend.md](../docs/firebase-backend.md)):
one 2nd-gen HTTPS function (`api`, `server/src/functions.ts`) serving the
Express app, Firestore for persistence. The Oracle VM / compose / Caddy
deployment was decommissioned 2026-09-06.

```bash
cd server && npm run deploy:functions -- --project mana-battle-f3b15
curl https://us-central1-mana-battle-f3b15.cloudfunctions.net/api/health  # → {"ok":true}
```

- **Env**: same `MANA_*` names, delivered as plain function env
  (`server/.env.<project>`, gitignored) plus the `MANA_STEAM_WEB_API_KEY`
  Secret Manager secret — see `docs/firebase-backend.md` §Environment /
  secrets mapping. `MANA_SQLITE_PATH` is ignored when Firestore is set.
- **Clients** bake the function URL at build time
  (`MANA_SERVER_URL=https://us-central1-mana-battle-f3b15.cloudfunctions.net/api`) —
  Steam Electron, itch.io web, and Android builds. The OAuth relay page moves
  with it (`<MANA_SERVER_URL>/oauth/callback`), so the itch.io and Google
  OAuth redirect registrations must point at the function relay URL.
- **Ops**: logs via `firebase functions:log`, data via the Firebase console.
  There is no SSH, no volumes, no local SQLite in production.

