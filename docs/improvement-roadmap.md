# Mana Battle — Improvement Roadmap (Remaining Tasks & State Goals)

**Created**: 2026-08-13 (Cline)
**Purpose**: Single-source plan for the remaining work in the AGENTS.md task queue and
the standing improvement docs, with explicit state goals, execution order, and
exit criteria per task. Supersedes the task list in [game-server.md](game-server.md)
for sequencing purposes (that doc keeps the full design).

## State goals (verified 2026-08-13)

| Area | Goal state | Now | Blocked by |
|---|---|---|---|
| Server Phase 1 (session API) | Done & merged | ✅ committed, 103 tests green | — |
| Server Phase 1.5 (Steam auth) | Done, merged, docs updated | ✅ done & merged (2026-08-13); 109 server tests green; only plan.md task 14 (manual Steam smoke test, needs real Steam key) pending | — |
| Framework hardening | P0+P1+P2 landed, regression tests | ✅ P0+P1+P2 landed (2026-08-13, 56 framework tests green, phaser typecheck/lint clean) | — |
| Server Phase 2 (matchmaking & rating) | Ghosts, opponent pick, PvE fallback, rating | ✅ committed (2026-08-13); 146 server tests green (109 baseline + 37 new); typecheck/build clean | — |
| Server Phase 3 (client integration) | HTTP `RemoteServer`, Supabase removed | ✅ done (2026-08-13); RemoteServer is an HTTP adapter (`createRemoteServer` factory, fetch-injectable); supabase quarantine deleted; 52 phaser tests green (41 + 11 new), typecheck/lint clean; server untouched (148 tests) | — |
| Server Phase 4 (durable persistence) | SQLite repos, restart survival | ✅ done (2026-08-14); `better-sqlite3` repos behind the existing interfaces, `MANA_SQLITE_PATH` (unset = in-memory default, `:memory:` supported), restart-survival test green; 167 server tests green, typecheck/build clean | — |
| Large-file decomposition | big suites/slides/createScreen.ts split, tests green | ✅ done (2026-08-14); 424 core tests green (32→41 suites), 56 framework (2→7 suites), 52 phaser tests green | — |
| Core code-quality P1/P2 leftovers | rank-up unification, orb registry dispatch, throw policy, Option adoption | ⏳ partial | design decisions |

## Execution order (subagents run in this sequence)

### 1. Server Phase 1.5 — finish & merge Steam-only auth — ✅ DONE (2026-08-13)
- plan.md tasks 10 (rate-limit `POST /auth/steam`), 11 (Electron preload
  `auth.getSteamAuthTicket` hook), 12 (client login flow feeding Phase 3) are
  complete; task 13 (auth + middleware + integration tests) verified/complete.
- `docs/auth.md` status updated (implementation notes & deviations section
  added), `plan.md` checkboxes updated (task 14 — manual Steam smoke test —
  still pending: requires a real publisher Web API key + Steam Electron build),
  AGENTS.md task queue entry checked off.
- **Exit**: ✅ all 100+ server tests green (109), typecheck/build clean,
  `X-Player-Id` fully removed from the codebase, task queue checked off.

### 2. Framework hardening P0 — nav-mutex failure semantics — ✅ DONE (2026-08-13)
- `framework/src/ScreenManager.ts`: self-healing chain (`then(run, run)`), reset
  `activeScreen` on transition failure, optional `onError` hook, rethrow to caller.
- Regression tests: nav recovers after a failed transition; `current()` is null
  after failure; the original `go()` call still rejects; coalescing + same-screen
  dedupe preserved; deep-link `"tab"` behavior intact.
- **Exit**: ✅ 46 framework tests green (38 baseline + 8 new), typecheck clean,
  P0 checked off in [framework-hardening.md](framework-hardening.md) and AGENTS.md.

### 3. Framework hardening P1 — async lifecycle — ✅ DONE (2026-08-13)
- P1a: `Destroyable.destroy(): void | Promise<void>`; `go()`/`refresh()` await
  phase teardowns (`await tr.clearPhase()`, skipped on the first transition);
  screen-level destroy stays fire-and-forget (`runDestroy()` swallows sync
  throws + async rejections).
- P1b: per-screen promise chain in `go()`/`refresh()` (self-healing
  `then(op, op)` — same pattern as the P0 nav mutex); `destroy()` detaches the
  chain and swallows in-flight outcomes; `runPhase()` bails out if the screen
  was destroyed mid-transition (after exit transition / after clearPhase /
  after the phase handler).
- The `runPhaseHandler` adapter was already gone (phases return
  `Destroyable`s directly) — no BattlegroundScreen migration needed.
- Regression tests (5, in `framework/src/createScreen.test.ts`): `go()` awaits
  the outgoing phase's async destroy before creating the next phase;
  `refresh()` awaits it too; two rapid `go()` calls serialize; a rejected
  async destroy rejects `go()` but the screen stays usable (later go/refresh
  work); a rejected phase create rejects `go()` without poisoning later
  transitions.
- **Exit**: ✅ 51 framework tests green (46 baseline + 5 new), typecheck
  clean, P1a + P1b checked off in
  [framework-hardening.md](framework-hardening.md) and AGENTS.md.

### 4. Framework hardening P2 — hardening sweep — ✅ DONE (2026-08-13)
- Unknown-phase warning (`go("<undeclared>")` warns + no-ops), per-screen
  `mapDeepLink` mapper replacing the hardcoded `"tab"` convention (OptionsScreen
  migrated), event-`clear()`/`destroy()` idempotency ownership rule (documented
  in framework/README.md + tested), active-tracker duplicate-id guard (warn +
  keep first).
- **Exit**: ✅ 56 framework tests green (51 baseline + 5 new), typecheck clean,
  phaser typecheck/lint clean, P2 checked off in
  [framework-hardening.md](framework-hardening.md) and AGENTS.md.

### 5. Server Phase 2 — matchmaking & rating — ✅ DONE (2026-08-13)
- `GhostRepo`/`RatingRepo` interfaces + in-memory impls (ghosts keyed by round,
  per-player capped recently-fought log); ghost snapshot per `start_combat`
  (sanitized: clamped positions, CPU force, full life); opponent selection
  (same round, rating band ±150, widen +150 per miss up to 3 steps, exclude
  self + recently fought, deterministic closest-rated pick); PvE fallback via
  `generateEnemyTeamForRound` (name "PvE") — a match is always guaranteed;
  wins-based rating delta on run completion (ported `getMultiplayerRatingDelta`
  gold 6 / silver 4 / bronze 2 / default 1), applied exactly once (terminal
  session guard + per-session applied set); default rating 1000 initialized on
  first session creation; opponent ghost id / PvE marker recorded in the
  session action_log payload.
- **Exit**: ✅ 146 server tests green (109 baseline + 37 new: matchmaking unit
  suite incl. match-in-band, self excluded, recently-fought excluded, band
  widening, PvE fallback; rating delta suite; flow tests for ghost-per-round +
  exactly-once rating; HTTP tests for ghost storage, PvE fallback response and
  rating after a completed run), typecheck/build clean, Phase 2 checked off in
  AGENTS.md. Deviations: recently-fought list lives on the GhostRepo (capped at
  20, FIFO) and the opponent marker is written to the action log rather than a
  new session field (avoids a core SessionData change).

### 6. Server Phase 3 — client integration — ✅ DONE (2026-08-13)
- Rewrote `phaser/src/RemoteServer.ts` as a thin HTTP adapter implementing the
  `GameServer`/`ServerAdapter` interface (`createSession`, `handleAction`,
  `deleteSession` + `getSession`/`getPhaseOptions` parity), decoding
  `CombatStateDto` via the core `CombatCodec`, server URL from
  `MANA_SERVER_URL` (default `http://127.0.0.1:8787`), bearer-token auth via
  `getBearerToken()` (steamAuth). Injectable `createRemoteServer({ fetch,
  serverUrl, getBearerToken })` factory for tests; 401s → clear
  re-authentication error; no-token requests reject before fetch; the client
  never sends a seed (server generates it). `GameServer.ts` now returns the
  `remoteServer` singleton for multiplayer; single-player still uses
  `LocalServer`.
- Deleted quarantined Supabase code: `src/lib/supabase.ts`, `phaser/supabase/`,
  `scripts/bundle-edge.ts`, `@supabase/supabase-js` (+ lockfile), the
  `test:supabase` / `bundle:edge` / `deploy:functions` scripts, stale jest
  ignore entries, and `Screens/ArenaLobby/`.
- **Exit**: ✅ 52 phaser tests green (41 baseline + 11 new RemoteServer tests),
  phaser typecheck/lint clean, server untouched (148 tests green).
  Deviation: `NODE_OPTIONS='--experimental-vm-modules'` breaks jest global
  injection on this machine (Node ESM + jsdom → `jest is not defined`), so
  tests ran via the package's own `jest --runInBand --passWithNoTests`
  (matches CI's `npm run test:ci`, which has no NODE_OPTIONS).

### 7. Server Phase 4 — durable persistence — ✅ DONE (2026-08-14)
- `better-sqlite3` implementations of `SessionRepo`, `PlayerRepo`, `TokenRepo`,
  `GhostRepo`, `RatingRepo` behind the same interfaces (`server/src/persistence/sqlite.ts`);
  `MANA_SQLITE_PATH` config (unset = in-memory repos — default; file path or
  `:memory:` opts into SQLite, wired through `createApp`/`index.ts`);
  restart-survival test (kill/restart mid-run → `GET /sessions/current`
  resumes): writes to a temp FILE, closes the Database, reopens fresh repos on
  the same file, and asserts the player/token/session/ghost/rating state —
  including a mid-combat session with a byte-identical resume payload — survives,
  and the run can continue (`end_combat` after restart).
- Schema deviation (documented in sqlite.ts + game-server.md): the old
  Supabase `combat_states(session_id, json)` table is kept, but it stores the
  CombatCodec-serialized DTO of the embedded `SessionData.combatState` — the
  live state carries a `Map` that plain JSON cannot hold, so serializing it
  inside the session row would corrupt resume-mid-combat. Players/ratings/tokens
  are split across `players`/`ratings`/`tokens` tables (old schema kept rating +
  token_hash on the players row).
- **Exit**: ✅ 167 server tests green (148 baseline + 19 new: sqlite repo
  round-trips for all five repos, config var tests, `createApp` sqlite boot,
  restart-survival flow), typecheck/build clean, Phase 4 checked off in
  AGENTS.md, production bundle boots with SQLite (smoke-tested: WAL files
  created, `/health` 200, graceful shutdown).

## Out of scope for this run (captured for later)

- ~~**Low priority**: large-file decomposition~~ — ✅ DONE (2026-08-14): see task 8 below.
- **E2E suite** (broken `debugController` import) — separate from the server plan.
- **Core P1/P2** items needing design decisions (canonical rank-up formula, throw
  policy, `noUncheckedIndexedAccess`) — game-design / convention calls.
- **Server Phase 5 extras**: leaderboard, agent play service, replay validation,
  token refresh, guest auth.

### 8. Low priority — large-file decomposition — ✅ DONE (2026-08-14)
- Split the 4 big test suites: `ReactionIntegration.test.ts` → 4 files,
  `CombatSimulation.test.ts` → 3 files (+ shared
  `__test_utils__/combatSimulationHarness.ts`), `EffectIntegration.test.ts` → 4
  files, `framework/src/createScreen.test.ts` → 5 files (+ shared
  `framework/src/__test_utils__/screenTestHarness.ts`).
- Extracted `phaser/.../Title/Components/TutorialOverlay.ts` slides →
  `tutorialSlides.ts`; extracted `PhaseTracker`/`TrackedGroup`/`findTrackedById`
  from `framework/src/createScreen.ts` → `framework/src/phaseTracker.ts`
  (public API unchanged — re-exports kept).
- All pure refactors: test bodies moved byte-identically, RNG call order intact.
- **Exit**: ✅ 424 core tests green (32 → 41 suites), 56 framework (2 → 7
  suites), 52 phaser tests green, phaser typecheck/lint clean.

## Verification commands

```bash
cd server && npm test && npm run typecheck && npm run build
cd framework && npm test && npm run typecheck
cd core && npm test && npm run typecheck
cd phaser && npm run typecheck && npm run lint
```
