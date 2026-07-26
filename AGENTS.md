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

### Key Architectural Patterns

1. **Combat Playback**: Combat is simulated server-side → produces logs → client plays back animations. Entry: `RunCombatIO.ts` → `serverCombatDemo.ts` → `CombatPlaybackController.ts`.
2. **Server Adapter**: Single-player and multiplayer both go through `GameServer` interface. `getServerAdapter()` in `Core/ServerFactory.ts` returns the right adapter.
3. **Phase System**: New handler-based system in `Core/PhaseSystem/` with `PhaseHandler` interface. Legacy `PhaseManager.ts` in `Engine/Scenes/Battleground/` still runs the main loop.
4. **Trigger System**: Units have `effects` (actions on cooldown) and `reactions` (responses to other units' effects). Defined in `TriggerSystem/TriggerSystem.ts`.
5. **Battleground phase orchestration**: `Client/Screens/Battleground/BattlegroundScene.ts` owns the phase loop; phase handlers and battleground UI modules should route server actions and reads through `Core/GameController.ts`.

## Current Issues

> Update this section as you find or fix bugs.

- **~~Single-player wins are never recorded~~ ✅ FIXED** (2026-07-25, Cline): `CombatSimulation.determineCombatOutcome` is now called at the end of `simulateCombat` to set `wonCombat`. It was made safe against missing outcome logs (defaults to loss with console.warn). `initialUnits` is now a separate deep clone instead of aliasing `units`. Added regression tests in both `CombatSimulation.test.ts` (9 new tests for wonCombat, initialUnits, and determineCombatOutcome) and `SessionTransitions.test.ts` (first tests for this module). All 391 core tests pass.
- **~~`applyOrb` discards RNG advancement~~ ✅ FIXED** (2026-07-25, Cline): `applyOrb` now returns the (possibly advanced) seed; `SessionTransitions` writes it back to `session.seed`. Consecutive reaction orbs no longer repeat identical picks.
- **~~`createCombatState.initialUnits` aliases `units`~~ ✅ FIXED** — `initialUnits` now gets its own deep clone.
- **Supabase edge handler drift**: `phaser/supabase/functions/action/index.ts` calls `GameLogic.transitionToNextState(session, actionId, payload, options)` (4 args) and reads `transitionResult.combatResult`, but current core `transitionToNextState(session, action)` returns `{ session, combatState? }`. Committed `_shared.js` bundles (Jul 18) predate core changes (Jul 24); re-running `bundle:edge` without updating the handler will break the MP action path. **Do not patch or re-bundle** — these functions are retired; the replacement is the new `server/` backend ([docs/game-server.md](docs/game-server.md), whose Phase 0 exposes the enemy-team override this handler needed).
- **~~`SessionTransitions.pendingCombatState`** is a module-level mutable singleton (the same anti-pattern previously removed from `CombatSystemStates`); thread the combat state through the handler return type instead. **Hard blocker for the game server** — concurrent sessions would race on it; the fix is Phase 0 of [docs/game-server.md](docs/game-server.md). ✅ FIXED (2026-07-26, Cline): See AGENTS_ARCHIVE.md.
- **Three divergent rank-up formulas**: `RecruitmentActions.recruitUnit` (×1.5, no effect scaling), `Entities/Unit.upgradeUnitData` (source.power × rankMultiplier + effect scaling), `OrbAndCoreUpgrades.applyUpgradeOrb` (×1.75). Unify.
- **~~`sacrifice_effect_orb` is a silent no-op~~ ✅ FIXED** (2026-07-25, Cline): Added `applySacrificeOrb` in `OrbAndCoreUpgrades.ts` — removes a random effect or reaction from the target unit and grants +10 power. Wired into `applyOrb` dispatch. Added 5 unit tests. All 401 core tests pass.
- **`phaser/` test pipelines broken**: `npm test` finds 0 tests in `phaser/src` (CI `unit-tests.yml` red) and Playwright collects 0 e2e specs (broken imports in `e2e/game.e2e.spec.ts` + `testMatch` mismatch). `jest.config.cjs` has stale `moduleNameMapper` entries pointing to deleted dirs. Full fix plan: [code-quality-cleanup.md](docs/code-quality-cleanup.md).
- **Multiplayer backend reimplementation → `server/`**: the design and phased plan live in [docs/game-server.md](docs/game-server.md). Supabase edge functions (`phaser/supabase/`), `src/RemoteServer.ts`, `src/lib/supabase.ts`, and `src/Screens/ArenaLobby/` (dead code with a guaranteed crash at `ArenaLobbyScene.ts:471-473`) remain quarantined — do not invest in fixing bugs there; they get deleted in Phase 3 of the server plan.

## Task Queue

> Pick a task, mark it `[x]` with your agent name and date when done. Add new tasks as discovered.

### High Priority

Game server implementation (phased plan: [docs/game-server.md](docs/game-server.md)):

- [ ] **Server Phase 0 — core hardening**: ~~remove the `SessionTransitions.pendingCombatState` singleton (thread combat state through handler returns)~~ ✅ DONE; add `transitionToNextState(session, action, options?: { enemyTeam?, enemyPlayerName? })`; add pure combat-state wire codec (`serializeCombatState`/`deserializeCombatState`) in `core/`
- [ ] **Server Phase 1 — session API skeleton**: `server/` package (Node 22, ESM, express 5, `@game/*` alias), guest auth (`POST /players`), in-memory repos, `POST /sessions`, `GET /sessions/current`, `POST /sessions/current/actions`; jest + HTTP integration tests; revive `FullSessionFlow` tests
- [ ] **Server Phase 2 — matchmaking & rating**: ghost snapshots per round, opponent selection (same round, rating band, exclude self), PvE fallback via `EnemyGeneration`, rating delta on run completion
- [ ] **Server Phase 3 — client integration**: rewrite `phaser/src/RemoteServer.ts` as an HTTP adapter for the new API (`MANA_SERVER_URL`); then delete `src/lib/supabase.ts`, `phaser/supabase/`, `scripts/bundle-edge.ts`, `Screens/ArenaLobby/`, and the supabase scripts/deps per code-quality-cleanup.md §3
- [ ] **Server Phase 4 — durable persistence**: SQLite (`better-sqlite3`) implementations of the repository interfaces; restart-survival test

### Medium Priority

- [ ] Migrate remaining ~200 `io.xxx` calls across ~30 files to `env.*` / direct Phaser calls
- [ ] Wire the new server-side LLM play service into automated leaderboard match runners (becomes the agent play service in Phase 5 of [docs/game-server.md](docs/game-server.md); blocked on server Phases 1–2)

### Low Priority

- [ ] Reorganize project file structure (see TODO.md for proposed layout)

### Completed
- Historical completed entries live in [AGENTS_ARCHIVE.md](AGENTS_ARCHIVE.md).
- Add new completed work there when closing tasks so this file stays focused on active items.
