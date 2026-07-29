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

### Key Architectural Patterns

1. **Three-tier Event System** — Events are categorized by lifespan and scope:

   | Tier | File | Wired when | Payload rule | Example |
   |---|---|---|---|---|
   | **Screen-scoped** | Each screen module (e.g. `TitleScreen` exports `events`) | Per `init()` | May carry Phaser refs | `newGameButtonClicked`, `crystalChanged` |
   | **Screen-lifecycle-crossing** | `phaser/src/Events.ts` — `BattlegroundEvent` | Per battleground entry (create/destroy) | Plain data only | `phaseFinished`, `combatPlaybackFinished` |
   | **Global game events** | `phaser/src/Events.ts` — `GameEvent` | Once at boot (never torn down) | **Plain data only — no Phaser refs ever** | `screenShown`, `screenHidden`, `runStarted` |

   - Screen-scoped events: created in `init()`, wrapped by `createScreenLifecycle()` for idempotent init + automatic cleanup via `lifecycle.destroy()`.
   - `BattlegroundEvent`: wired per screen entry in `BattlegroundScreen.create()`, disposed in `BattlegroundScreen.destroy()`. Carries domain data only.
   - `GameEvent` (added 2026-07-28): wired once in `Client.ts` `wireGameEvents()`. Listeners must never capture Phaser game objects. Services (Tooltip, AudioManager, StatsStore) subscribe here instead of being imported by screens.

2. **Screen lifecycle** — Every screen is a plain module exporting `{ name, init?, create, destroy? }` matching the `ScreenModule` type in `Client.ts`. Navigation is centralized via `switchScreen()` in `Client.ts`:
   - `screenHidden` (GameEvent) → `destroy()` → input disable → fadeOut → `children.removeAll(true)` → `tweens.killAll()` → `time.removeAllEvents()` → cursor reset → `init()` → `create()` → `activeScreen = screen` → `screenShown` (GameEvent) → input enable → fadeIn.
   - All calls are **serialised** by a promise-chain mutex (added 2026-07-28). If multiple navigation events queue while one is in flight, only the latest target runs. Coalesces redundant requests.
   - **New screens should use `createScreen()`** from `phaser/src/Screens/screenTracking.ts` (added 2026-07-29): the spec's `events()` factory replaces manual `createScreenLifecycle()` wiring, `ctx.add(obj, { id })` auto-tracks destroyables — Phaser objects and wrappers like BackgroundOverlay — in a persistent layer or phase scope, `phases` declare mutually exclusive sub-states (e.g. TitleScreen's main/submenu/options_submenu/language) whose tracked elements are auto-destroyed on transition, and `ctx.findById` / `findTrackedById` recover elements by ID instead of module-level refs. Elements with translated text (e.g. howToPlay) are rendered per-phase via a shared chrome helper so locale changes apply on the next phase transition — no full-screen re-render. Components with infinite tweens must self-clean via `Phaser.GameObjects.Events.DESTROY` (Phaser does not auto-kill tweens of destroyed targets).

3. **Navigation mutex** — `Client.ts` uses a promise-chain pattern (`navChain`, `pendingNavTarget`):
   - `switchScreen(A); switchScreen(B); switchScreen(C)` → A runs, B is skipped (coalesced), C runs.
   - Same-screen requests are dropped immediately.
   - Prevents interleaved fade/create/destroy sequences from rapid clicks or async emits.

4. **Combat Playback**: Combat is simulated server-side → produces logs → client plays back animations. Entry: `RunCombatIO.ts` → `serverCombatDemo.ts` → `CombatPlaybackController.ts`.

5. **Server Adapter**: Single-player and multiplayer both go through `GameServer` interface. `getServerAdapter()` in `Core/ServerFactory.ts` returns the right adapter.

6. **Phase System**: New handler-based system in `Core/PhaseSystem/` with `PhaseHandler` interface. Legacy `PhaseManager.ts` in `Engine/Scenes/Battleground/` still runs the main loop.

7. **Trigger System**: Units have `effects` (actions on cooldown) and `reactions` (responses to other units' effects). Defined in `TriggerSystem/TriggerSystem.ts`.

8. **Battleground phase orchestration**: `phaser/src/Screens/Battleground/BattlegroundScreen.ts` owns the phase loop via `PhaseHandler` objects with `name`/`start()`/teardown. Phases create a dedicated Phaser Container for their UI so teardown is a single `container.destroy(true)` call. `activeTeardown` is guaranteed to run on every phase transition AND screen destruction.

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


### Low Priority



