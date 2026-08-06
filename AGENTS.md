# AI Agent Guide — Mana Battle

This file is the entry point for AI agents working on the Mana Battle codebase. Read this first to orient yourself, then pick a task and get to work. **Update this file when you complete a task or discover new issues.**

The file plan.md contains the overall project plan and roadmap, including tasks that are currently in progress, completed, or planned for future development.

## Agent Workflow

1. **Read this file** to orient yourself.
2. **Pick a task** from the Task Queue.
3. **Read the relevant docs** from the Knowledge Index.
4. **Check the coding standards** before writing code.
5. **Implement the change**, including tests where appropriate.
6. **Update this file**: remove the task that was completed, and append it to the file AGENTS_ARCHIVE.md . If you discover new issues or tasks during your work, add them to this file.

## Project Overview

Mana Battle is a PVE trigger-based autobattler on a 3x3 board, built with Phaser 3 + TypeScript, packaged with Electron for desktop and Capacitor for Android. See the [README](README.md) for the public-facing overview. Multiplayer sessions will be served by a new Node game server in `server/` (replacing the retired Supabase backend) — see [docs/game-server.md](docs/game-server.md).

## Quick Start

```bash
cd phaser
npm install
npm run dev        # http://localhost:8080
npm run test       # jest unit tests
npm run test:e2e   # playwright e2e tests
npm run lint       # eslint
```

## Coding Standards

See [.github/instructions/mana-battle-standards.instructions.md](.github/instructions/mana-battle-standards.instructions.md).

Key rules:
- **Prefer functional programming**: plain objects, pure functions, immutability, higher-order functions.
- **Classes only for Phaser integration**: scenes, game objects extending Phaser classes.
- **Minimize inheritance**: no unnecessary inheritance chains.
- **Client-server boundary**: battleground screens, phase handlers, and related UI flows should call `Core/GameController.ts` rather than importing `Core/GameServer.ts` directly.

## Knowledge Index

### Architecture & Source Layout

Pure, framework-agnostic game logic is being extracted into a top-level `core/` package (aliased as `@game/*`); see [core/README.md](core/README.md) for the migration plan. Most logic has migrated to `core/` — see its [index.ts](core/src/index.ts) for the full directory layout.

- `core/` (top-level package, aliased as `@game/*`)
  - Purpose: Pure, framework-agnostic game logic — see [core/src/index.ts](core/src/index.ts) for the full barrel export
  - Key modules: `math/` (Random, Geometry, Constants), `board/` (BoardLogic), `Combat/` (simulation, runner, logger, poison, regen, timeout, status systems), `Entities/` (Card, Unit, Force), `session/` (management, transitions, option/enemy generation), `TriggerSystem/` (triggers & effects), `Actions/` (recruitment, orb upgrades), `Orbs/` (definitions, constants), `data/` (BaseCollection, effect builders), `PhaseSystem/` (phase config), `types/` (domain type definitions), `Functional/` (primitives), `Event/`
- `framework/` (top-level package, aliased as `@mana/framework`)
  - Purpose: Engine-agnostic client framework — screen lifecycle, resource tracking, typed navigation (Phase D of [docs/framework-formalization.md](docs/framework-formalization.md))
  - Key modules: `Screen.ts` (`ScreenModule` contract), `createScreen.ts` (factory + `screenModule()`), `ScreenManager.ts` (nav core: registry, nav mutex, typed routes, deep-links + engine hooks), `Router.ts`, `Event.ts` (re-export of the core event primitive). Own jest + tsconfig; run `npm test` / `npm run typecheck` inside `framework/`
- `phaser/src/Screens/Battleground/`
  - Purpose: Phaser scene orchestration — main battleground screen, phase handlers, combat playback
  - Key files: `BattlegroundScreen.ts`, `Components/`, `Phases/`, `playerBoardSync.ts`
- `phaser/src/`
  - Purpose: Remaining Phaser-specific code (screens, UI components, effects, assets)

- `server/` (planned)
  - Purpose: Authoritative Node game server API for multiplayer sessions — replaces the retired Supabase backend
  - Key files: none yet — implementation plan: [docs/game-server.md](docs/game-server.md)

### Documentation Index

Detailed docs live in `docs/`. Each covers a specific system:

- [building-and-running.md](docs/building-and-running.md): Setup, all npm scripts, platform requirements
- [battle-system.md](docs/battle-system.md): Phase management, combat flow, board logic
- [combat-architecture.md](docs/combat-architecture.md): Client-server combat separation, playback system
- [game-server.md](docs/game-server.md): Plan for the new `server/` Node game server — multiplayer session API, ghost matchmaking, persistence, client integration
- [trigger-system.md](docs/trigger-system.md): Action-Reaction model, effects, targeting
- [character-unit-system.md](docs/character-unit-system.md): Unit/Card types, Chara rendering system
- [unit-balance.md](docs/unit-balance.md): Power budget, cost formulas, trigger frequencies
- [purity-boundary.md](docs/purity-boundary.md): Pure logic boundary, replay-critical import rules
- [storage-system.md](docs/storage-system.md): Provider pattern, Steam Cloud, localStorage
- [audio-system.md](docs/audio-system.md): Music, SFX, cooldowns, user preferences
- [ui-system.md](docs/ui-system.md): UI components, event handling, layout management
- [effect-system.md](docs/effect-system.md): Visual effect pipeline, particles, and combat integration
- [options-system.md](docs/options-system.md): Options data model, persistence, UI bindings
- [localization.md](docs/localization.md): i18n, adding languages, fallback logic
- [achievement-system.md](docs/achievement-system.md): Steam achievements, victory tiers
- [code-quality-cleanup.md](docs/code-quality-cleanup.md): Verified code-quality findings for `phaser/` and the prioritized cleanup plan (incl. multiplayer-backend reimplementation scope)
- [core-code-quality.md](docs/core-code-quality.md): Verified code-quality findings for `core/` and the prioritized improvement plan (incl. the confirmed single-player win-recording bug)
- [framework-formalization.md](docs/framework-formalization.md): Long-term vision for extracting Screen, ScreenManager, createScreen, and Router into a framework package (`@mana/framework`). Phases A–D roadmap. Screen state purity rules.
- [framework-hardening.md](docs/framework-hardening.md): Verified evaluation findings for `@mana/framework` and the prioritized hardening plan (nav-mutex failure semantics, async teardown support, lifecycle serialization).
- [battleground-screen-migration.md](docs/battleground-screen-migration.md): Completed plan for migrating BattlegroundScreen to `createScreen()` via the `runPhaseHandler` adapter.

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

4. **Combat Playback**: Combat is simulated server-side → produces logs → client plays back animations. Entry: `RunCombatIO.ts` → `serverCombatDemo.ts` → `CombatPlaybackController.ts`.

5. **Server Adapter**: Single-player and multiplayer both go through `GameServer` interface. `getServerAdapter()` in `Core/ServerFactory.ts` returns the right adapter.

6. **Phase System**: New handler-based system in `Core/PhaseSystem/` with `PhaseHandler` interface. Legacy `PhaseManager.ts` in `Engine/Scenes/Battleground/` still runs the main loop.

7. **Trigger System**: Units have `effects` (actions on cooldown) and `reactions` (responses to other units' effects). Defined in `TriggerSystem/TriggerSystem.ts`.

8. **Battleground phase orchestration**: `phaser/src/Screens/Battleground/BattlegroundScreen.ts` owns the phase loop via `PhaseHandler` objects with `name`/`start()`/teardown, bridged into the `createScreen()` lifecycle (migration completed 2026-08-01 — see [docs/battleground-screen-migration.md](docs/battleground-screen-migration.md)). Phases create a dedicated Phaser Container for their UI so teardown is a single `container.destroy(true)` call. `transitionToCurrentPhase` (wired to `BattlegroundEvent.phaseFinished`, kicked off in `create()`) reads the phase from session state, syncs the player board (except around combat), **awaits the previous phase's teardown**, then calls the framework `go(phase)`. `runPhaseHandler` wraps each handler's `TeardownFn` in a tracked `Destroyable` so it also fires on screen destruction; a `consumed` flag prevents double-teardown between the two paths. Phase-scoped events (combat pause/replay/continue, victory continue — 2026-08-03) are subscribed via `ctx.listen()` inside the phase handler, so they're auto-disposed when the phase ends; previously these were module-level `combatListeners` wired at screen level, which stayed active for the whole screen lifetime and failed to re-subscribe on a second battleground entry.

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

- **Battleground persistent layer destroyed on phase transitions** (fixed 2026-08-05, Cline): `BattlegroundScreen.create()` fired its initial phase transition via `transitionToCurrentPhase()` **without `await`**. `runPhase()` synchronously calls `tracker.beginPhase()` (switching the tracker to `"phase"` mode), then yields on the phase handler's `await`. Control returns to `create()`, which returns the persistent elements (board, UI, bg, etc.); `trackReturned()` tracked them into the **phase** map instead of **persistent**, so the next phase switch's `clearPhase()` destroyed them. Fix: `await transitionToCurrentPhase()` in `create()` so `endPhase()` resets the tracker before the persistent elements are returned. Also hardened the framework (`@mana/framework` 2026-08-05): `create()`'s returned elements are now always tracked via `trackPersistent()` (mode-independent), so even a screen that fires an initial `ctx.go()` without awaiting it cannot leak its persistent layer into `phaseObjects`. Added regression test `create() returned elements survive phase switches even when the initial ctx.go() is not awaited`.

- **E2E suite is broken on `single_scene` branch** (found 2026-07-29): `phaser/e2e/*.e2e.ts` import `../src/test-utils/debugController`, but that module does not exist in git — all e2e runs fail with "Cannot find module". The `debugController` API used by the specs (`getPlayerBoardUnits`, `addUnitToPlayerBoard`, `moveUnitOnBoard`, `logGameState`) needs to be reimplemented against the current screen architecture. Also note `game.e2e.spec.ts` doesn't match `testMatch: /.*\.e2e\.ts/` so it never runs even when resolvable.


## Task Queue

> Pick a task, mark it `[x]` with your agent name and date when done. Add new tasks as discovered.

### High Priority

Game server implementation (phased plan: [docs/game-server.md](docs/game-server.md)):

- [x] **Server Phase 0 — core hardening**: ✅ DONE (2026-07-26, Cline). Added `options?: { enemyTeam?, enemyPlayerName? }` to `transitionToNextState`; threaded `enemyPlayerName` through `executeCombatPhase` → `createCombatState`; added pure combat-state wire codec (`serializeCombatState`/`deserializeCombatState` + `CombatStateDto` type) in `core/src/Combat/CombatCodec.ts`; added 4 new transition tests + 3 codec round-trip tests. All changes backward-compatible. See AGENTS_ARCHIVE.md.
- [~] **Server Phase 1 — session API skeleton**: IN PROGRESS (2026-07-26, Cline). `server/` package scaffolded (Node 22, ESM, express 5, `@game/*` alias, tsx/jest/tsup). In-memory session repo created. Endpoints: `POST /api/v1/sessions`, `GET /api/v1/sessions/current`, `POST /api/v1/sessions/current/actions`, `DELETE /api/v1/sessions/current`. HTTP integration tests written (8 tests). CombatState serialization via codec. Remaining: `npm install` + verify `npm run dev` + `npm test`; guest auth `POST /players` (deferred — no auth for local dev); revive `FullSessionFlow` tests.
- [ ] **Server Phase 2 — matchmaking & rating**: ghost snapshots per round, opponent selection (same round, rating band, exclude self), PvE fallback via `EnemyGeneration`, rating delta on run completion
- [ ] **Server Phase 3 — client integration**: rewrite `phaser/src/RemoteServer.ts` as an HTTP adapter for the new API (`MANA_SERVER_URL`); then delete `src/lib/supabase.ts`, `phaser/supabase/`, `scripts/bundle-edge.ts`, `Screens/ArenaLobby/`, and the supabase scripts/deps per code-quality-cleanup.md §3
- [ ] **Server Phase 4 — durable persistence**: SQLite (`better-sqlite3`) implementations of the repository interfaces; restart-survival test

### Medium Priority

Framework hardening (verified findings + plan: [docs/framework-hardening.md](docs/framework-hardening.md)):

- [ ] **P0: nav-mutex failure semantics** — self-healing promise chain (`then(run, run)`), reset `activeScreen` on transition failure, `onError` hook, regression tests (reproduced 2026-08-01: after a rejected `create()`, navigation is dead until reload and `current()` reports a destroyed screen)
- [ ] **P1: async lifecycle** — async `Destroyable` support (`destroy(): void | Promise<void>`, awaited on phase transitions) + per-screen `go()` serialization; removes the BattlegroundScreen `runPhaseHandler` adapter
- [ ] **P2: hardening sweep** — unknown-phase warning, per-screen deep-link mapper (replaces the hardcoded `"tab"` convention), event-`clear()` ownership rule, active-tracker duplicate guard


### Low Priority



