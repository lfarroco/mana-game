# Game Server — Multiplayer Backend Plan

**Status**: 📋 Plan (implementation not started)
**Created**: 2026-07-25
**Supersedes** (once implemented): [supabase-backend.md](supabase-backend.md), [commit-replay-multiplayer.md](commit-replay-multiplayer.md), [MULTIPLAYER_SETUP.md](MULTIPLAYER_SETUP.md), and the Supabase-specific parts of [multiplayer-architecture.md](multiplayer-architecture.md)

## Purpose

Create `server/` — a standalone Node.js package hosting the **authoritative game server API for multiplayer sessions**. It replaces the retired Supabase edge functions (`phaser/supabase/`), which are quarantined pending deletion (see [code-quality-cleanup.md](code-quality-cleanup.md)).

Scope:

- **v1**: guest auth, session lifecycle, action dispatch, server-side combat, async "ghost" PvP matchmaking, rating, in-memory persistence.
- **Later**: durable persistence (SQLite), leaderboards, LLM agent play service, replay validation, Steam auth.

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
      routes/players.ts   # POST /players (guest signup)
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

Base path `/api/v1`. JSON in/out. Auth via `Authorization: Bearer <token>` for everything except `GET /health` and `POST /players`.

| Method | Path | Body → Response | Notes |
|---|---|---|---|
| GET | `/health` | → `{ ok: true }` | liveness |
| POST | `/players` | `{ displayName? }` → `{ playerId, token }` | guest account; token returned once |
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

1. `POST /sessions` → `SessionManagement.createInitialSession(playerId, serverSeed, crystalId)` with `session_type = { type: "multiplayer", queueType }`. **The server generates the seed** (replay authority; aligns with the deferred-submission item in plan.md).
2. `POST .../actions`:
   - Load session (404 if none); reject if already `victory` / `game_over`.
   - A per-player mutex serializes actions; `clientActionId` dedupes retries.
   - `start_combat` → `combatService`: snapshot the team as a ghost, pick an opponent (below), then `transitionToNextState(session, action, { enemyTeam, enemyPlayerName })`. Persist the resulting combat state so a reconnect mid-combat can resume playback (mirrors `LocalServer`'s localStorage persistence).
   - Everything else → `transitionToNextState(session, action)`.
   - `end_combat` resulting in `victory` / `game_over` → apply the rating delta.
3. **Core changes required first (Phase 0 blockers)**:
   - **Remove the `SessionTransitions.pendingCombatState` module-level singleton** — thread the combat state through handler return values. A concurrent server would race on it today.
   - **Expose the enemy-team override**: `executeCombatPhase(session, enemyTeam?)` already accepts an override internally, but `transitionToNextState` doesn't surface it. Add `transitionToNextState(session, action, options?: { enemyTeam?: Unit[]; enemyPlayerName?: string })`. (Same shape the retired Supabase handler expected — this heals the drift with a typed API.)

## Matchmaking (async "ghost" PvP) & rating

Retained from the retired backend — it fits an autobattler: no real-time coordination, opponents always available.

- On every `start_combat`, store a **ghost**: `{ playerId, sessionId, round, team, rating, createdAt }`.
- Opponent pick: same `round`, rating band (start ±150, widen on repeated misses), exclude self and recently-fought players.
- Fallback: `EnemyGeneration.generateEnemyTeamForRound(round, wins, seed)` (PvE team) — a match is always guaranteed.
- Rating: on run completion, apply a wins-based delta (port `getMultiplayerRatingDelta` from `phaser/supabase/functions/_shared/multiplayer-rating.ts` before deleting it). Elo-style per-battle deltas can come later.

## Persistence

- **v1**: in-memory `Map`s behind repository interfaces (`persistence/memory.ts`) — zero external deps, fully testable, fine for a single-node alpha.
- **Phase 4**: SQLite (`better-sqlite3`) implementing the same interfaces. Schema ≈ the old Supabase tables: `players(id, display_name, token_hash, rating, created_at)`, `sessions(player_id PK, …SessionData as json)`, `combat_states(session_id PK, json)`, `ghosts(player_id, session_id, round, team_json, rating, created_at)`.
- Postgres only if we ever need multiple instances — the repository pattern keeps it swappable.

## Auth

- **v1**: guest flow — `POST /players` returns a `playerId` + opaque bearer token (stored hashed server-side). The client persists it in localStorage, replacing the current client-side random `player_###` id in `RemoteServer.ts`.
- **Phase 5**: Steam auth (port the `auth-steam` edge function logic), token refresh/expiry.


## Client integration (Phase 3)

1. Rewrite `phaser/src/RemoteServer.ts` as a thin HTTP adapter implementing the client's `GameServer` interface (`createSession`, `handleAction`) with `getSession` / `getPhaseOptions` parity, decoding `CombatStateDto` via the core codec. Server URL from config (`MANA_SERVER_URL`, default `http://127.0.0.1:8787` for dev).
2. Then delete the quarantined code (per [code-quality-cleanup.md](code-quality-cleanup.md) §3): `phaser/src/lib/supabase.ts`, `phaser/supabase/`, `scripts/bundle-edge.ts`, the `@supabase/supabase-js` dependency, the `bundle:edge` / `test:supabase` / `deploy:functions` scripts, `phaser/src/Screens/ArenaLobby/`, and the stale docs this plan supersedes.

## Implementation phases

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **0. Core hardening** | `pendingCombatState` singleton removed; enemy-team override param on `transitionToNextState`; combat-state codec | core tests green; new tests for the override + codec round-trip |
| **1. Server skeleton** | package scaffolding, config, express app, guest auth, in-memory repos, session + action endpoints | `npm run dev` serves; jest + HTTP integration tests green; full-run flow test passes |
| **2. Matchmaking & rating** | ghosts, opponent selection, rating on run completion | unit tests: match found in band, self excluded, PvE fallback, rating applied exactly once |
| **3. Client integration** | HTTP `RemoteServer`; supabase removal | client typecheck/lint green; manual MP run against a local server end-to-end |
| **4. Durable persistence** | SQLite repos + schema; restart survival | kill/restart the server mid-run → `GET /sessions/current` resumes |
| **5. Extras** | leaderboard endpoint; agent play service (revives `agentGameServer`; unblocks the queued leaderboard-match-runner task); replay validation; Steam auth | per-feature |

Phase 0 is small and independently mergeable. Phases 1–2 can land while the server is dev-only; Phase 3 wires the client.

## Testing strategy

- **Unit**: services against in-memory repos (fast; seeded RNG → deterministic).
- **HTTP integration**: supertest-style against an ephemeral port (`server.listen(0)`).
- **Contract**: codec round-trip tests in core; the client adapter tests reuse the same DTO fixtures.
- **Flow**: revive the removed `server/` `FullSessionFlow.test.ts` against `sessionService` (session → encounters → shops → combats → victory/game_over).

## Config & deployment

- Env: `MANA_SERVER_HOST` (default `127.0.0.1`), `MANA_SERVER_PORT` (default `8787`), `MANA_SQLITE_PATH` (Phase 4), `MANA_TOKEN_TTL_DAYS`.
- Single Node process: `npm run build && npm start`. Dockerfile + a host (fly.io / Render / VPS) decided at Phase 4; no edge-runtime requirements.

## Risks & open questions

- **Real-time PvP?** This plan assumes async ghosts. Synchronous PvP would need WebSockets + lockstep simulation — out of scope; revisit only with a concrete product need.
- **Rating algorithm**: wins-based delta (old behavior) vs Elo on ghost matches — start with the old behavior, tune later.
- **Action idempotency**: `clientActionId` dedupe window — in-memory LRU vs persisted?
- **Session cache**: the old 60s TTL cache was an edge-function artifact; skip until profiling says otherwise.
- **Simultaneous runs per player**: v1 = one active session per player (matches the old `player_sessions` uniqueness).
