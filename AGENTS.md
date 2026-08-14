# AI Agent Guide — Mana Battle

This file is the entry point for AI agents working on the Mana Battle codebase. 

## Agent Workflow

-. **Read this file** to orient yourself.
-. **Read the relevant docs** from the Knowledge Index.
-. **Check the coding standards** before writing code.
-. **Implement the change**, including tests where appropriate.


## Project Overview

Mana Battle is a PVE trigger-based autobattler on a 3x3 board, built with Phaser 3 + TypeScript, packaged with Electron for desktop and Capacitor for Android. See the [README](README.md) for the public-facing overview. Multiplayer sessions are served by the Node game server in `server/` (Phase 1 session API implemented 2026-08-11) - see [docs/game-server.md](docs/game-server.md).

## Quick Start

```bash
npm run format # at root, to run prettier over the whole project (core/, phaser/, server/, and framework/)

cd phaser
npm install
npm run dev        # http://localhost:8080
npm run test       # jest unit tests
npm run test:e2e   # playwright e2e tests, currently broken
npm run lint       # eslint
```

## Coding Standards

Key rules:
- **Prefer functional programming**: plain objects, pure functions, immutability, higher-order functions.
- **Classes only for Phaser integration**: scenes, game objects extending Phaser classes.
- **Minimize inheritance**: no unnecessary inheritance chains.
- **Client-server boundary**: battleground screens and phase handlers dispatch actions via `env.dispatch` (wired once in `Client.ts` to `GameServer.getServer().handleAction`) and the `dispatchAction`/`finishPhase` helpers in `BattlegroundScreen.ts`, rather than importing `phaser/src/GameServer.ts` directly.

## Knowledge Index

### Architecture & Source Layout

Pure, framework-agnostic game logic is being extracted into a top-level `core/` package (aliased as `@game/*`); see [core/README.md](core/README.md) for the migration plan. Most logic has migrated to `core/` — see its [index.ts](core/src/index.ts) for the full directory layout.

- `core/` (top-level package, aliased as `@game/*`)
  - Purpose: Pure, framework-agnostic game logic — see [core/src/index.ts](core/src/index.ts) for the full barrel export
  - Key modules: `math/` (Random, Geometry, Constants), `board/` (BoardLogic), `Combat/` (simulation, runner, logger, poison, regen, timeout, status systems), `Entities/` (Card, Unit, Force), `session/` (management, transitions, option/enemy generation), `TriggerSystem/` (triggers & effects), `Actions/` (recruitment, orb upgrades), `Orbs/` (definitions, constants), `data/` (BaseCollection, effect builders), `PhaseSystem/` (phase config), `types/` (domain type definitions), `Functional.ts` (primitives), `Event.ts`
- `framework/` (top-level package, aliased as `@mana/framework`)
  - Purpose: Engine-agnostic client framework — screen lifecycle, resource tracking, typed navigation (Phase D of [docs/framework-formalization.md](docs/framework-formalization.md))
  - Key modules: `Screen.ts` (`ScreenModule` contract), `createScreen.ts` (factory + `screenModule()`), `ScreenManager.ts` (nav core: registry, nav mutex, typed routes, deep-links + engine hooks), `Router.ts`, `Event.ts` (re-export of the core event primitive). Own jest + tsconfig; run `npm test` / `npm run typecheck` inside `framework/`
- `phaser/src/Screens/Battleground/`
  - Purpose: Phaser scene orchestration — main battleground screen, phase handlers, combat playback
  - Key files: `BattlegroundScreen.ts`, `Components/`, `Phases/`, `playerBoardSync.ts`
- `phaser/src/`
  - Purpose: Remaining Phaser-specific code (screens, UI components, effects, assets)

- `server/` (top-level package, Node 22 + express 5, imports core via `@game/*`)
  - Purpose: Authoritative Node game server API for multiplayer sessions — replaces the retired Supabase backend (Phase 1 session API implemented 2026-08-11)
  - Key files: `src/app.ts`, `src/http/routes/sessions.ts`, `src/services/sessionService.ts`, `src/persistence/` (`repositories.ts` + in-memory `memory.ts`), `src/dto.ts`; phased plan: [docs/game-server.md](docs/game-server.md)

### Documentation Index

Detailed docs live in `docs/`. Each covers a specific system:

- [building-and-running.md](docs/building-and-running.md): Setup, all npm scripts, platform requirements
- [battle-system.md](docs/battle-system.md): Phase management, combat flow, board logic
- [combat-architecture.md](docs/combat-architecture.md): Client-server combat separation, playback system
- [game-server.md](docs/game-server.md): Phased plan for the Node multiplayer backend — Phase 1 (session API) implemented; Steam-only auth designed, matchmaking, client integration, and durable persistence still pending
- [auth.md](docs/auth.md): Server auth design — Steam-only login (Steam tickets → `AuthenticateUserTicket` → your own bearer tokens), guest accounts in a future phase, provider abstraction
- [trigger-system.md](docs/trigger-system.md): Action-Reaction model, effects, targeting
- [character-unit-system.md](docs/character-unit-system.md): Unit/Card types, Chara rendering system
- [unit-balance.md](docs/unit-balance.md): Power budget, cost formulas, trigger frequencies
- [card-design-philosophy.md](docs/card-design-philosophy.md): Tier design (bronze/silver/gold roles), the upgrade curve, card authoring checklist
- [card-system-risks-and-roadmap.md](docs/card-system-risks-and-roadmap.md): Risk analysis and sequenced improvement plan for the card system — silver pool expansion, gold feasibility audits, disruption mechanics, AP model refinements
- [purity-boundary.md](docs/purity-boundary.md): Pure logic boundary, replay-critical import rules
- [storage-system.md](docs/storage-system.md): Provider pattern, Steam Cloud, localStorage
- [audio-system.md](docs/audio-system.md): Music, SFX, cooldowns, user preferences
- [ui-system.md](docs/ui-system.md): UI components, event handling, layout management
- [encounter-system.md](docs/encounter-system.md): Encounter generation, shop flow, phase structure — how the 15 encounter types filter, price, and sequence card/orb acquisition between combats
- [effect-system.md](docs/effect-system.md): Visual effect pipeline, particles, and combat integration
- [options-system.md](docs/options-system.md): Options data model, persistence, UI bindings
- [localization.md](docs/localization.md): i18n, adding languages, fallback logic
- [achievement-system.md](docs/achievement-system.md): Steam achievements, victory tiers
- [code-quality-cleanup.md](docs/code-quality-cleanup.md): Verified code-quality findings for `phaser/` and the prioritized cleanup plan (incl. multiplayer-backend reimplementation scope)
- [core-code-quality.md](docs/core-code-quality.md): Verified code-quality findings for `core/` and the prioritized improvement plan (incl. the confirmed single-player win-recording bug)
- [framework-formalization.md](docs/framework-formalization.md): Long-term vision for extracting Screen, ScreenManager, createScreen, and Router into a framework package (`@mana/framework`). Phases A–D roadmap. Screen state purity rules.
- [framework-hardening.md](docs/framework-hardening.md): Verified evaluation findings for `@mana/framework` and the prioritized hardening plan (nav-mutex failure semantics, async teardown support, lifecycle serialization).
- [combat-playback-performance.md](docs/combat-playback-performance.md): Further performance optimizations for the combat playback system beyond the initial July 2026 round
- [combat-system-improvements.md](docs/combat-system-improvements.md): Remaining improvements to the effect/reaction engine, threshold reactions, and combat test infrastructure in `core/`
- [project-architecture.md](docs/project-architecture.md): High-level architecture breakdown of the `core/`, `framework/`, `phaser/`, and `server/` packages

### Key Architectural Patterns

1. **Three-tier Event System** — Events are categorized by lifespan and scope:

   | Tier                          | File                                                     | Wired when                              | Payload rule                              | Example                                     |
   |-------------------------------|----------------------------------------------------------|-----------------------------------------|-------------------------------------------|---------------------------------------------|
   | **Screen-scoped**             | Each screen module (e.g. `TitleScreen` exports `events`) | Per `init()`                            | May carry Phaser refs                     | `newGameButtonClicked`, `crystalChanged`    |
   | **Screen-lifecycle-crossing** | `phaser/src/Events.ts` — `BattlegroundEvent`             | Per battleground entry (create/destroy) | Plain data only                           | `phaseFinished`, `combatPlaybackFinished`   |
   | **Global game events**        | `phaser/src/Events.ts` — `GameEvent`                     | Once at boot (never torn down)          | **Plain data only — no Phaser refs ever** | `screenShown`, `screenHidden`, `runStarted` |

   - Screen-scoped events: created in `init()`, wrapped by `createScreen()` (via the `screenModule()` helper) for idempotent init + automatic cleanup.
   - `BattlegroundEvent`: wired per screen entry in `BattlegroundScreen.create()`, disposed in `BattlegroundScreen.destroy()`. Carries domain data only.
   - `GameEvent` (added 2026-07-28): wired once in `Client.ts` `wireGameEvents()`. Listeners must never capture Phaser game objects. Services (Tooltip, AudioManager, StatsStore) subscribe here instead of being imported by screens.

2. **Screen lifecycle** — Every screen is a plain module exporting `{ name, init?, create, destroy? }` matching the `ScreenModule` type in `@mana/framework`. Navigation is centralized via the **ScreenManager** (`phaser/src/Screens/ScreenManager.ts`, added 2026-07-31, Phase C of framework-formalization; since Phase D (2026-08-01) it is a thin Phaser adapter over `@mana/framework`'s nav core, injecting fades/input/scene-cleanup/`GameEvent` emission via hooks):
   - Screens call `getScreenManager().go(route, params)` instead of emitting navigation events. `NavigationEvent` was removed from `Events.ts`.
   - `screenHidden` (GameEvent) → `destroy()` → input disable → fadeOut → `children.removeAll(true)` → `tweens.killAll()` → `time.removeAllEvents()` → cursor reset → `init()` → `create()` → `activeScreen = screen` → `screenShown` (GameEvent) → input enable → fadeIn.
   - All calls are **serialised** by a promise-chain mutex (added 2026-07-28). If multiple navigation events queue while one is in flight, only the latest target runs. Coalesces redundant requests.
   - **New screens should use `createScreen()`** from `@mana/framework` (`framework/src/createScreen.ts`; added 2026-07-29 as `Screens/screenTracking.ts`, extracted to the framework package 2026-08-01). Scaffold with `npm run new:screen -- <Name>` in `phaser/`, then register the route in `Screens/ScreenManager.ts` (`Routes`) and the screen in `Client.ts`. The spec's `events()` factory replaces manual event wiring, `ctx.track(obj, { id })` auto-tracks destroyables in a persistent layer or phase scope (also accepts arrays via `ctx.track(objs)` with optional `idPrefix`), `phases` declare mutually exclusive sub-states whose tracked elements are auto-destroyed on transition — or omit `phases` entirely for single-view screens. `ctx.listen(event, cb)` (added 2026-08-03) subscribes to an event for the **current scope's lifetime**: inside a phase handler the subscription is disposed on the next phase switch / `ctx.refresh()`; in the persistent `create` layer it survives transitions and dies on screen destroy — this gives phases their own scoped listeners without a per-phase event catalog. `ctx.refresh()` destroys and re-runs the current phase handler (useful for locale changes). `ctx.findById` / `findTrackedById` recover elements by ID. The `screenModule()` helper reduces per-screen export boilerplate to a single destructure line. Components with infinite tweens must self-clean via `Phaser.GameObjects.Events.DESTROY`.

3. **Navigation mutex** — `ScreenManager` uses a promise-chain pattern (`navChain`, `pendingNavTarget`):
   - `go("title"); go("crystals"); go("title")` → A runs, B is skipped (coalesced), C runs.
   - Same-screen requests are dropped immediately.
   - Prevents interleaved fade/create/destroy sequences from rapid clicks or async emits.
   - Typed routes with per-route params (e.g. `go("options", { tab: "graphics" })` deep-links to a tab).

4. **Combat Playback**: Combat is simulated server-side → produces logs → client plays back animations. Entry: `Phases/Combat/handleCombatPhase.ts` (`CombatPhase` → `beginCombatPlayback`) → `Phases/Combat/CombatPlaybackController.ts`.

5. **Server Adapter**: Single-player and multiplayer both go through the `ServerAdapter` interface (`phaser/src/GameServer.ts`). `getServer()` returns `LocalServer` or `RemoteServer` based on the session's `session_type`.

6. **Phase Config**: `core/src/PhaseSystem/PhaseConfig.ts` defines the per-round phase rotation (`ROUND_PHASES`, `advanceToNextPhase`, `getPhaseForTurn`). The battleground main loop runs in `phaser/src/Screens/Battleground/BattlegroundScreen.ts` (see item 8).

7. **Trigger System**: Units have `effects` (actions on cooldown) and `reactions` (responses to other units' effects). Defined in `TriggerSystem/TriggerSystem.ts`.

8. **Battleground phase orchestration**: `phaser/src/Screens/Battleground/BattlegroundScreen.ts` declares every phase directly in `createScreen({ phases })` — each handler is a `(ctx) => Destroyable(s)` function whose returned elements the framework tracks and auto-destroys on phase switch or screen destroy (the former `runPhaseHandler` + `consumed`-flag adapter was removed as phases migrated, completed 2026-08-01). Phases create a dedicated Phaser Container for their UI so teardown is a single `container.destroy(true)` call. `transitionToCurrentPhase` (wired to `BattlegroundEvent.phaseFinished`, kicked off in `create()`) reads the phase from session state, calls `syncPlayerBoardUnits()` to reconcile the player board, tears down the previous phase's tracked elements, then calls the framework `go(phase)`. Phase-scoped events (combat pause/replay/continue, victory continue — 2026-08-03) are subscribed via `ctx.listen()` inside the phase handler, so they're auto-disposed when the phase ends; previously these were module-level `combatListeners` wired at screen level, which stayed active for the whole screen lifetime and failed to re-subscribe on a second battleground entry. The `combat` phase is split into a playback phase plus client-only results phases (`combat_victory`/`combat_defeat`, 2026-08-07): `combat` plays the battle back and on `playbackFinished` calls `go(combatState.wonCombat ? "combat_victory" : "combat_defeat")`; the results phases render the victory/defeat overlay + combat-stats table and handle continue (tears down combat then dispatches `end_combat`) and replay (`go("combat")`) via `ctx.listen`. These sub-phases are client-only view states — not present in `session.phase` — so resuming a saved game always lands at combat playback.

9. **DOM cleanup pattern** — For any DOM elements created by screens (e.g. the virtual keyboard in crystal selection), track them via module-level refs and export a `destroy()` function:
   ```ts
   let activeContainer: HTMLElement | null = null;
   let activeTimeoutId: ReturnType<typeof setTimeout> | null = null;
   export function destroy(): void {
       if (activeTimeoutId) { clearTimeout(activeTimeoutId); activeTimeoutId = null; }
       if (activeContainer && document.body.contains(activeContainer)) {
           document.body.removeChild(activeContainer);
       }
       activeContainer = null;
   }
   ```
   The screen's `destroy()` must call this. `create()` should call `destroy()` first for idempotency. Never rely on `Phaser.Scenes.Events.SHUTDOWN` — it never fires in the single-scene setup (added 2026-07-28).

## Issues

> Update this section as you find bugs.

- **E2E suite is broken** (found 2026-07-29): `phaser/e2e/*.e2e.ts` import `../src/test-utils/debugController`, but that module does not exist in git — all e2e runs fail with "Cannot find module". The `debugController` API used by the specs (`getPlayerBoardUnits`, `addUnitToPlayerBoard`, `moveUnitOnBoard`, `logGameState`) needs to be reimplemented against the current screen architecture. Also note `game.e2e.spec.ts` doesn't match `testMatch: /.*\.e2e\.ts/` so it never runs even when resolvable.


## Task Queue

> Pick a task, mark it `[x]` with your agent name and date when done. Add new tasks as discovered.

### High Priority


- [x] **Server Phase 1 — session API skeleton**: DONE (2026-08-11, Cline). `server/` package scaffolded (Node 22, ESM, express 5, `@game/*` alias, tsx/jest/tsup) + full session API: per-player in-memory repo behind a `SessionRepo` interface (swap for SQLite later), `X-Player-Id` header identity (v1 — token auth deferred), `POST /api/v1/sessions` (requires `crystalId`, 409 if an active session exists, server-generated seed, `session_type: multiplayer`), `GET /api/v1/sessions/current` (serialized `combatState` while in combat for reconnect), `POST /api/v1/sessions/current/actions` (validated `Action`, 409 on terminal phases, 422 on core rejection, combat state via `CombatCodec`), `DELETE /api/v1/sessions/current`. DTO validation (`dto.ts`), typed `ApiError`, CORS + request-logging middleware, `MANA_CORS_ORIGIN` config. Tests: 43 passing (HTTP integration incl. per-player isolation, dto unit tests, revived full-run flow test). `npm run typecheck`/`test`/`build` verified; Docker image builds and runs (`/health` smoke-tested). Remaining deferred: token auth (identity still `X-Player-Id` header, dev-only); auth design documented in [docs/auth.md](docs/auth.md) (2026-08-13, Steam-only).
- [x] **Server auth — Steam-only (Phase 1.5)**: DONE (2026-08-13). Implemented per [docs/auth.md](docs/auth.md) — `PlayerRepo`/`TokenRepo` (in-memory), `POST /api/v1/auth/steam` (ticket → `AuthenticateUserTicket` → player upsert → opaque bearer token, SHA-256-hashed), Bearer middleware replacing `X-Player-Id`, per-IP rate limit on the auth endpoint (`express-rate-limit`), Electron preload `auth.getSteamAuthTicket` hook, client login flow (`phaser/src/lib/steamAuth.ts`, token persisted via the storage provider, `getBearerToken()` ready for Phase 3). No guest endpoints (guest accounts are a future phase). Tests: mocked Steam Web API, token expiry, 401s on missing/invalid tokens, 429 rate-limit, client module jest suite — 109 server tests green + phaser typecheck/lint clean. **Remaining: plan.md task 14 — manual Steam smoke test (needs a real publisher Web API key + Steam Electron build).** Task breakdown: [plan.md](plan.md)
- [x] **Server Phase 2 — matchmaking & rating**: DONE (2026-08-13). `GhostRepo`/`RatingRepo` (in-memory, behind interfaces — SQLite swap in Phase 4); `start_combat` snapshots the player's team as a sanitized ghost per round, resolves the opponent via matchmaking (same round, rating band ±150 widening +150/step ×3, exclude self + recently fought — capped per-player FIFO on the GhostRepo, deterministic closest-rated pick), PvE fallback via `EnemyGeneration.generateEnemyTeamForRound` (name "PvE", match always guaranteed); wins-based rating delta on run completion (`getMultiplayerRatingDelta` gold 6/silver 4/bronze 2/default 1 ported from the retired Supabase function), applied exactly once (terminal-session 409 + per-session applied set); default rating 1000 on first session creation; opponent ghost id / PvE marker recorded in the session action_log. Tests: 146 server tests green (109 baseline + 37 new: matchmaking unit suite, rating suite, flow tests ghost-per-round + exactly-once rating, HTTP ghost/PvE/rating integration), typecheck/build clean. Deviations: recently-fought list lives on the GhostRepo (not a new session field); opponent marker written to the action log payload to avoid a core `SessionData` change.
- [ ] **Server Phase 3 — client integration**: rewrite `phaser/src/RemoteServer.ts` as an HTTP adapter for the new API (`MANA_SERVER_URL`); then delete `src/lib/supabase.ts`, `phaser/supabase/`, `scripts/bundle-edge.ts`, `Screens/ArenaLobby/`, and the supabase scripts/deps per code-quality-cleanup.md §3
- [ ] **Server Phase 4 — durable persistence**: SQLite (`better-sqlite3`) implementations of the repository interfaces; restart-survival test

### Medium Priority

Framework hardening (verified findings + plan: [docs/framework-hardening.md](docs/framework-hardening.md)):

- [x] **P0: nav-mutex failure semantics** — DONE (2026-08-13): self-healing promise chain (`then(run, run)`), `activeScreen` reset to null on transition failure, optional `onError` hook, 8 regression tests in `framework/src/ScreenManager.test.ts` (46 framework tests green, typecheck clean). (Reproduced 2026-08-01: after a rejected `create()`, navigation was dead until reload and `current()` reported a destroyed screen.)
- [x] **P1: async lifecycle** — DONE (2026-08-13): async `Destroyable` support (`destroy(): void | Promise<void>`, awaited on phase transitions via `await clearPhase()`) + per-screen self-healing `go()`/`refresh()` serialization (`phaseChain.then(op, op)`), destroy-bail checks in `runPhase()`. 5 regression tests in `framework/src/createScreen.test.ts` (51 framework tests green, typecheck clean). (The old BattlegroundScreen `runPhaseHandler` adapter was already gone — phases now return `Destroyable`s directly.)
- [x] **P2: hardening sweep** — DONE (2026-08-13): unknown-phase warning (`go("<undeclared>")` warns + no-ops), per-screen `mapDeepLink` mapper replacing the hardcoded `"tab"` convention (OptionsScreen migrated), event-`clear()`/`destroy()` idempotency ownership rule documented + tested, active-tracker duplicate-id guard (warn + keep first). 5 P2 regression tests in `framework/src/` (56 framework tests green, typecheck clean, phaser typecheck/lint clean).


### Low Priority

- [ ] **Large-file decomposition (P1 batch)** — split the 4 big test suites (`ReactionIntegration`, `CombatSimulation`, `EffectIntegration`, `createScreen.test`), `TutorialOverlay.ts` slides, and `createScreen.ts` (types/PhaseTracker/screenModule). All pure refactors; core splits must keep the 424-test suite green and RNG call order intact.



