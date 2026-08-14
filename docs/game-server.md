# Game Server — Multiplayer Backend Plan

**Status**: ✅ Phase 1 (session API) implemented 2026-08-11; ✅ Phase 1.5 (Steam-only auth) implemented 2026-08-13 — see [auth.md](auth.md); ✅ Phase 2 (matchmaking & rating) implemented 2026-08-13; ✅ Phase 3 (client integration) implemented 2026-08-13 — `phaser/src/RemoteServer.ts` is a live HTTP adapter, Supabase quarantine deleted; ✅ Phase 4 (durable persistence) implemented 2026-08-14 — `better-sqlite3` repos behind the same interfaces, `MANA_SQLITE_PATH` opt-in, restart-survival test green
**Created**: 2026-07-25
**Supersedes**: [supabase-backend.md](supabase-backend.md), [commit-replay-multiplayer.md](commit-replay-multiplayer.md), [MULTIPLAYER_SETUP.md](MULTIPLAYER_SETUP.md), and the Supabase-specific parts of [multiplayer-architecture.md](multiplayer-architecture.md) — none of these exist on disk (verified 2026-08-13); this doc is authoritative

## Purpose

Create `server/` — a standalone Node.js package hosting the **authoritative game server API for multiplayer sessions**. It replaces the retired Supabase edge functions (`phaser/supabase/`), which were deleted 2026-08-13 as part of Phase 3 (see [code-quality-cleanup.md](code-quality-cleanup.md)).

Scope:

- **v1**: Steam-only auth, session lifecycle, action dispatch, server-side combat, async "ghost" PvP matchmaking, rating, in-memory persistence.
- **Later**: durable persistence (SQLite), leaderboards, LLM agent play service, replay validation, guest/non-Steam auth.

Non-goals (v1): WebSockets / real-time play, synchronous PvP, tournaments.

## Multiplayer model (recap)

Per [core/README.md](../core/README.md):

- **Request-response**: the client sends an `Action`; the server applies it via `@mana/core` and returns the new `SessionData` (plus a pre-computed `CombatState` when the action triggers combat).
- **Server is authoritative** — the client never simulates or predicts game logic.
- Single-player keeps running in-process via `LocalServer`; only multiplayer sessions hit the HTTP API.

## Why replace Supabase

- **Edge-handler drift**: `phaser/supabase/functions/action/index.ts` calls a 4-arg `GameLogic.transitionToNextState(session, actionId, payload, options)` that no longer exists in core (current: `transitionToNextState(session, action)` → `{ session, combatState? }`). The committed `_shared.js` bundles predate the core changes, so re-running `bundle:edge` would break the MP action path.
- The Deno edge runtime forced shim-heavy bundles (`window`, `localStorage`, `Phaser` globals in `scripts/bundle-edge.ts`).
- We want a normal Node runtime, first-class tests, and `npm run dev` parity with the client.

## Architecture

### Tech stack

- Node ≥ 22, TypeScript, ESM (`"type": "module"`) — mirrors the removed `server/` package and `core/`.
- Express 5 for HTTP (prior art in the old `server/`; keep deps minimal — no ORM).
- `tsx` for dev, `tsc --noEmit` typecheck, `jest` + `ts-jest` tests, `tsup` for the production build.
- Game logic imported exclusively through the `@game/*` path alias → `../core/src/*` (same pattern as the old `server/tsconfig.json`).

### Import rules (extends core/README's three-layer model)

- `server/` may import `@game/*` (core) only — never `phaser/`.
- `phaser/` never imports `server/`. Wire types/codecs needed by both sides live in `core/`.

### Directory layout

```
server/
  package.json            # mana-game-server, private, ESM
  tsconfig.json           # paths: @game/* → ../core/src/*
  jest.config.cjs
  README.md               # how to run, endpoint summary
  src/
    index.ts              # entry: config → app → listen, graceful shutdown
    app.ts                # express app assembly (routes + middleware)
    config.ts             # env parsing (PORT, HOST, SQLITE_PATH, ...)
    http/
      middleware/auth.ts  # Bearer token → playerId
      middleware/errors.ts
      routes/players.ts   # POST /players (guest signup — future phase)
      routes/sessions.ts  # session CRUD + action dispatch
    services/
      sessionService.ts   # wraps core SessionManagement + SessionTransitions
      combatService.ts    # start_combat orchestration: opponent pick → transition
      matchmaking.ts      # ghost snapshots + opponent selection
      rating.ts           # rating deltas on run completion
    persistence/
      repositories.ts     # PlayerRepo, SessionRepo, CombatStateRepo, GhostRepo, RatingRepo
      memory.ts           # in-memory implementations (v1)
      sqlite.ts           # durable implementations (Phase 4)
    dto.ts                # wire DTOs + request validation (uses core combat codec)
  test/
    sessionFlow.test.ts   # full-run flow (revives the old server/ FullSessionFlow tests)
    api.test.ts           # HTTP integration tests on an ephemeral port
    matchmaking.test.ts
```


## API (v1)

Base path `/api/v1`. JSON in/out. Auth via `Authorization: Bearer <token>` for everything except `GET /health` and `POST /auth/steam`.

| Method | Path | Body → Response | Notes |
|---|---|---|---|
| GET | `/health` | → `{ ok: true }` | liveness |
| POST | `/auth/steam` | `{ ticket, identity, appId }` → `{ player, token }` | Steam auto-login (Electron); the Steam-only auth entry point — see [auth.md](auth.md) |
| POST | `/players` | `{ displayName? }` → `{ playerId, token }` | guest account; token returned once — **future phase**, not part of the Steam-only launch |
| POST | `/sessions` | `{ crystalId, queueType? }` → `SessionData` | creates an MP session; one active session per player (409 if one exists) |
| GET | `/sessions/current` | → `SessionData` (+ `combatState?` while `phase === "combat"`) | resume/reconnect; 404 if none |
| POST | `/sessions/current/actions` | `{ action: Action, clientActionId? }` → `{ session, combatState? }` | single action-dispatch endpoint; `clientActionId` gives idempotent retries |
| DELETE | `/sessions/current` | → 204 | abandon run |

Later (Phase 5): `GET /leaderboard`, `GET /players/me`, and agent endpoints reviving the removed `agentGameServer` surface (`POST /games`, `GET /games/:id/state`, `POST /games/:id/choices`, …).

### Wire format

- `SessionData` is already JSON-safe — sent as-is.
- `CombatState` is **not** JSON-safe (`unitById: Map`, plus derived fields `playerCore` / `cpuCore` / `playerUnits` / `cpuUnits`). The transport DTO carries only the source data:

  ```ts
  type CombatStateDto = {
    units: Unit[];            // initialUnits — playback starts from these
    logs: CombatLogEntry[];
    wonCombat: boolean;
    finalPlayerUnits: Unit[];
    enemyPlayerName: string;
  };
  ```

- Encode/decode lives in `core/` as a pure codec (`serializeCombatState` / `deserializeCombatState`): the server encodes, the client decodes and rebuilds the Map + derived fields. Both sides need it, it is pure logic, and it formalizes what `RemoteServer.getPhaseOptions` already does inline today.

## Session & combat flow (server-side)

1. `POST /sessions` → `SessionManagement.createInitialSession(playerId, serverSeed, crystalId)` with `session_type = { type: "multiplayer", queueType }`. **The server generates the seed** (replay authority).
2. `POST .../actions`:
   - Load session (404 if none); reject if already `victory` / `game_over`.
   - A per-player mutex serializes actions; `clientActionId` dedupes retries.
   - `start_combat` → `combatService`: snapshot the team as a ghost, pick an opponent (below), then `transitionToNextState(session, action, { enemyTeam, enemyPlayerName })`. Persist the resulting combat state so a reconnect mid-combat can resume playback (mirrors `LocalServer`'s localStorage persistence).
   - Everything else → `transitionToNextState(session, action)`.
   - `end_combat` resulting in `victory` / `game_over` → apply the rating delta.
3. **Core changes required first (Phase 0 blockers)**:
   - **~~Remove the `SessionTransitions.pendingCombatState` module-level singleton~~ ✅ DONE (2026-07-26)** — `executeCombatPhase` now embeds combat state in `session.combatState`; `transitionAfterCombat` reads from the session.
   - **Expose the enemy-team override**: `executeCombatPhase(session, enemyTeam?)` already accepts an override internally, but `transitionToNextState` doesn't surface it. Add `transitionToNextState(session, action, options?: { enemyTeam?: Unit[]; enemyPlayerName?: string })`. (Same shape the retired Supabase handler expected — this heals the drift with a typed API.)

## Matchmaking (async "ghost" PvP) & rating

Retained from the retired backend — it fits an autobattler: no real-time coordination, opponents always available.

- On every `start_combat`, store a **ghost**: `{ playerId, sessionId, round, team, rating, createdAt }`.
- Opponent pick: same `round`, rating band (start ±150, widen on repeated misses), exclude self and recently-fought players.
- Fallback: `EnemyGeneration.generateEnemyTeamForRound(round, wins, seed)` (PvE team) — a match is always guaranteed.
- Rating: on run completion, apply a wins-based delta (port `getMultiplayerRatingDelta` from `phaser/supabase/functions/_shared/multiplayer-rating.ts` before deleting it). Elo-style per-battle deltas can come later.

## Persistence

- **v1**: in-memory `Map`s behind repository interfaces (`persistence/memory.ts`) — zero external deps, fully testable, fine for a single-node alpha.
- **Phase 4 — ✅ DONE (2026-08-14)**: SQLite (`better-sqlite3`) implementing the same interfaces (`persistence/sqlite.ts`), selected via `MANA_SQLITE_PATH` (unset = in-memory default; file path or `:memory:` opts in). Schema ≈ the old Supabase tables, adapted to the current repo interfaces:
  - `players(player_id PK, provider, provider_id, display_name, created_at, UNIQUE(provider, provider_id))`
  - `tokens(token_hash PK, player_id, expires_at, created_at)` — the old schema kept token hashes on the players row; the current `TokenRepo` splits them out.
  - `sessions(player_id PK, session_json)` — `SessionData` as JSON.
  - `combat_states(session_id PK, combat_json)` — see deviation below.
  - `ghosts(ghost_id PK, player_id, session_id, round, team_json, rating, created_at)` + `recently_fought(player_id, opponent_player_id, seq)` — the per-player capped-FIFO matchmaking log.
  - `ratings(player_id PK, rating, updated_at)` — the old schema kept rating on the players row; the current `RatingRepo` is separate.
- **Combat-state deviation**: `SessionData.combatState` embeds the *live* `CombatState` (a `Map`-carrying object) while in the `combat` phase. Plain JSON cannot hold a `Map`, so a naive JSON round-trip of the session row would corrupt resume-mid-combat. The `combat_states` table therefore stores the JSON-safe `CombatStateDto` (via the core `CombatCodec`), keyed by session id; on load it is deserialized (Map + derived indexes rebuilt) and re-attached. The wire response after a restart is byte-identical to the pre-restart one. Session + combat rows are written atomically (single SQLite transaction).
- Postgres only if we ever need multiple instances — the repository pattern keeps it swappable.

## Auth

Steam-only — see **[auth.md](auth.md)** for the full design (data model, token scheme, flows, security).

- **Steam = identity proof, server = sessions**: `POST /auth/steam` validates the Electron client's `GetAuthTicketForWebApi` ticket against Steam's `AuthenticateUserTicket` Web API, upserts the player, and issues an opaque bearer token (SHA-256 hashed server-side).
- **All session endpoints** are authorized by `Authorization: Bearer <token>` (middleware in `http/middleware/auth.ts`), replacing the dev-only `X-Player-Id` header.
- **Guest accounts** are a future-phase concern (see auth.md) — the Steam-only launch has no guest endpoints. No Firebase/Supabase Auth for v1.
- **Display name** for Steam players = Steam persona (`localplayer.getName()` / `GetPlayerSummaries`).


## Client integration (Phase 3) — ✅ DONE (2026-08-13)

1. `phaser/src/RemoteServer.ts` rewritten as a thin HTTP adapter implementing the client's `ServerAdapter`/`GameServer` interface (`createSession`, `handleAction`, `deleteSession`) with `getSession` / `getPhaseOptions` parity, decoding `CombatStateDto` via the core codec. Injectable `createRemoteServer({ fetch, serverUrl, getBearerToken })` factory; bearer-token auth via `steamAuth.getBearerToken()`; server URL from `MANA_SERVER_URL` (default `http://127.0.0.1:8787` for dev); the client never sends a seed. `GameServer.getServer()` returns the `remoteServer` singleton for multiplayer; single-player still uses `LocalServer`.
2. Quarantined code deleted (per [code-quality-cleanup.md](code-quality-cleanup.md) §3): `phaser/src/lib/supabase.ts`, `phaser/supabase/`, `scripts/bundle-edge.ts`, the `@supabase/supabase-js` dependency (+ lockfile), the `bundle:edge` / `test:supabase` / `deploy:functions` scripts, `phaser/src/Screens/ArenaLobby/`, and stale jest ignore entries.

## Implementation phases

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **0. Core hardening** | `pendingCombatState` singleton removed; enemy-team override param on `transitionToNextState`; combat-state codec | core tests green; new tests for the override + codec round-trip |
| **1. Server skeleton** | package scaffolding, config, express app, in-memory repos, session + action endpoints (identity via `X-Player-Id` header, dev-only) | `npm run dev` serves; jest + HTTP integration tests green; full-run flow test passes |
| **1.5. Steam-only auth** | Player/token repos (in-memory), `POST /auth/steam` (ticket → Steam Web API → player upsert → bearer token), Bearer middleware replacing `X-Player-Id`; no guest endpoints (future phase) — see [auth.md](auth.md) | tests with a mocked Steam Web API; manual Steam auto-login against a local server; 401s on bad/expired tokens |
| **2. Matchmaking & rating** | ghosts, opponent selection, rating on run completion | unit tests: match found in band, self excluded, PvE fallback, rating applied exactly once |
| **3. Client integration** | HTTP `RemoteServer`; supabase removal | ✅ client typecheck/lint green, 52 phaser tests green (2026-08-13); manual MP run against a local server end-to-end still pending (needs the Steam Electron build) |
| **4. Durable persistence** | SQLite repos + schema; restart survival | ✅ done (2026-08-14): `better-sqlite3` repos (`persistence/sqlite.ts`), `MANA_SQLITE_PATH` opt-in (unset = in-memory default), restart-survival test proves close + reopen resumes a mid-combat session (`GET /sessions/current`); 167 server tests green, typecheck/build clean |
| **5. Extras** | leaderboard endpoint; agent play service (revives `agentGameServer`; unblocks the queued leaderboard-match-runner task); replay validation; token refresh/expiry; guest/non-Steam auth | per-feature |

Phase 0 is small and independently mergeable. Phases 1, 1.5, and 2 can land while the server is dev-only; Phase 3 wires the client.

## Testing strategy

- **Unit**: services against in-memory repos (fast; seeded RNG → deterministic).
- **HTTP integration**: supertest-style against an ephemeral port (`server.listen(0)`).
- **Contract**: codec round-trip tests in core; the client adapter tests reuse the same DTO fixtures.
- **Flow**: revive the removed `server/` `FullSessionFlow.test.ts` against `sessionService` (session → encounters → shops → combats → victory/game_over).

## Config & deployment

- Env: `MANA_SERVER_HOST` (default `127.0.0.1`), `MANA_SERVER_PORT` (default `8787`), `MANA_SQLITE_PATH` (Phase 4: unset = in-memory repos; a file path or `:memory:` opts into SQLite — the parent directory of a file path is created on boot, WAL journaling is enabled), `MANA_TOKEN_TTL_DAYS`, `MANA_STEAM_WEB_API_KEY` + `MANA_STEAM_APP_IDS` (auth — see [auth.md](auth.md)).
- Single Node process: `npm run build && npm start`. Dockerfile + a host (fly.io / Render / VPS) — the Dockerfile bundles `better-sqlite3` as a production dependency; the runtime stage compiles it natively (prebuilt binaries for common platforms, build tools only needed for exotic/musl targets).

## Risks & open questions

- **Real-time PvP?** This plan assumes async ghosts. Synchronous PvP would need WebSockets + lockstep simulation — out of scope; revisit only with a concrete product need.
- **Rating algorithm**: wins-based delta (old behavior) vs Elo on ghost matches — start with the old behavior, tune later.
- **Action idempotency**: `clientActionId` dedupe window — in-memory LRU vs persisted?
- **Session cache**: the old 60s TTL cache was an edge-function artifact; skip until profiling says otherwise.
- **Simultaneous runs per player**: v1 = one active session per player (matches the old `player_sessions` uniqueness).
