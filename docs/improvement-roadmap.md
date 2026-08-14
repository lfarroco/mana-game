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
| Framework hardening | P0+P1+P2 landed, regression tests | ⏳ P0+P1 landed (2026-08-13, 51 framework tests green); P2 pending | — |
| Server Phase 2 (matchmaking & rating) | Ghosts, opponent pick, PvE fallback, rating | ❌ not started | Phase 1.5 merge |
| Server Phase 3 (client integration) | HTTP `RemoteServer`, Supabase removed | ❌ RemoteServer still Supabase-based | Phase 2 |
| Server Phase 4 (durable persistence) | SQLite repos, restart survival | ❌ not started | Phase 3 |
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

### 4. Framework hardening P2 — hardening sweep
- Unknown-phase warning, per-screen deep-link mapper (replaces hardcoded `"tab"`),
  event-`clear()` ownership rule, active-tracker duplicate guard.
- **Exit**: framework tests green, typecheck clean, P2 checked off.

### 5. Server Phase 2 — matchmaking & rating
- `GhostRepo`/`RatingRepo` interfaces + in-memory impls; ghost snapshot per
  `start_combat`; opponent selection (same round, rating band ±150 widening,
  exclude self + recently fought); PvE fallback via `generateEnemyTeamForRound`;
  wins-based rating delta on run completion (port `getMultiplayerRatingDelta`).
- **Exit**: unit tests — match found in band, self excluded, PvE fallback, rating
  applied exactly once; HTTP flow test updated; Phase 2 checked off in AGENTS.md.

### 6. Server Phase 3 — client integration
- Rewrite `phaser/src/RemoteServer.ts` as an HTTP adapter implementing the
  `GameServer` interface using `CombatCodec`, server URL from
  `MANA_SERVER_URL` (default `http://127.0.0.1:8787`), bearer-token auth.
- Delete quarantined Supabase code: `src/lib/supabase.ts`, `phaser/supabase/`,
  `scripts/bundle-edge.ts`, `@supabase/supabase-js`, stale scripts, `ArenaLobby/`.
- **Exit**: client typecheck/lint green, Phase 3 checked off.

### 7. Server Phase 4 — durable persistence
- `better-sqlite3` implementations of `SessionRepo`, `PlayerRepo`, `TokenRepo`
  (+ ghost/rating repos from Phase 2); `MANA_SQLITE_PATH`; restart-survival test
  (kill/restart mid-run → `GET /sessions/current` resumes).
- **Exit**: server tests green (incl. restart-survival), Phase 4 checked off.

## Out of scope for this run (captured for later)

- **Low priority**: large-file decomposition (4 big test suites, `TutorialOverlay`
  slides, `createScreen.ts` split) — pure refactors, keep 424 core tests green.
- **E2E suite** (broken `debugController` import) — separate from the server plan.
- **Core P1/P2** items needing design decisions (canonical rank-up formula, throw
  policy, `noUncheckedIndexedAccess`) — game-design / convention calls.
- **Server Phase 5 extras**: leaderboard, agent play service, replay validation,
  token refresh, guest auth.

## Verification commands

```bash
cd server && npm test && npm run typecheck && npm run build
cd framework && npm test && npm run typecheck
cd core && npm test && npm run typecheck
cd phaser && npm run typecheck && npm run lint
```
