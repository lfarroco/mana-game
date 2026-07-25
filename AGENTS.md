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

Mana Battle is a PVE trigger-based autobattler on a 3x3 board, built with Phaser 3 + TypeScript, packaged with Electron for desktop and Capacitor for Android. See the [README](README.md) for the public-facing overview.

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

Pure, framework-agnostic game logic is being extracted into a top-level `core/` package (aliased as `@game/*`); see [core/README.md](core/README.md) for the migration plan. So far `core/src/Random.ts` and `core/src/Seeding.ts` live there. Everything else still lives under `phaser/src/`:

- `Core/`
  - Purpose: Pure game logic, no Phaser deps
  - Key files: `LocalServerAdapter.ts`, `GameLogic.ts`, `GameServer.ts`, `PhaseSystem/`
- `Engine/Scenes/`
  - Purpose: Phaser scene orchestration
  - Key files: `Battleground/PhaseManager.ts`, `Battleground/RunCombatCore.ts`, `Battleground/CombatPlaybackController.ts`
- `Systems/`
  - Purpose: Gameplay systems (combat, shop, board, audio)
  - Key files: `CombatPhase.ts`, `AudioManager.ts`, `AchievementSystem.ts`, `Chara/`, `Shop/`, `Encounter.ts`
- `Models/`
  - Purpose: Data models and board logic
  - Key files: `Entities/Unit.ts`, `Entities/Card.ts`, `Board.ts`, `BoardLogic.ts`, `State.ts`
- `TriggerSystem/`
  - Purpose: Action-Reaction effect engine
  - Key files: `TriggerSystem.ts`
- `Multiplayer/`
  - Purpose: Multiplayer manager & logic
  - Key files: `MultiplayerManager.ts`
- `Storage/`
  - Purpose: Save data (Steam Cloud / localStorage)
  - Key files: `StorageFactory.ts`, `SteamCloudProvider.ts`, `LocalStorageProvider.ts`
- `i18n/`
  - Purpose: Localization (en, es, pt, jp, cn, ru)
  - Key files: `i18n.ts`, `*.json`
- `Data/`
  - Purpose: Card/unit definitions
  - Key files: `BaseCollection.ts`
- `UI/`
  - Purpose: UI components
  - Key files: none listed
- `Effects/`
  - Purpose: Visual effects
  - Key files: none listed

### Documentation Index

Detailed docs live in `docs/`. Each covers a specific system:

- [building-and-running.md](docs/building-and-running.md): Setup, all npm scripts, platform requirements
- [battle-system.md](docs/battle-system.md): Phase management, combat flow, board logic
- [combat-architecture.md](docs/combat-architecture.md): Client-server combat separation, playback system
- [trigger-system.md](docs/trigger-system.md): Action-Reaction model, effects, targeting
- [character-unit-system.md](docs/character-unit-system.md): Unit/Card types, Chara rendering system
- [unit-balance.md](docs/unit-balance.md): Power budget, cost formulas, trigger frequencies
- [phase-system-refactoring.md](docs/phase-system-refactoring.md): New PhaseSystem handler architecture
- [purity-boundary.md](docs/purity-boundary.md): Pure logic boundary, replay-critical import rules
- [single-multiplayer-unification.md](docs/single-multiplayer-unification.md): GameServer interface, LocalServerAdapter, unification plan
- [multiplayer-architecture.md](docs/multiplayer-architecture.md): MultiplayerManager, server-driven phases
- [server-side-combat-migration.md](docs/server-side-combat-migration.md): Headless combat simulation (completed)
- [storage-system.md](docs/storage-system.md): Provider pattern, Steam Cloud, localStorage
- [audio-system.md](docs/audio-system.md): Music, SFX, cooldowns, user preferences
- [ui-system.md](docs/ui-system.md): UI components, event handling, layout management
- [effect-system.md](docs/effect-system.md): Visual effect pipeline, particles, and combat integration
- [options-system.md](docs/options-system.md): Options data model, persistence, UI bindings
- [supabase-backend.md](docs/supabase-backend.md): Supabase Edge Functions and Steam auth backend
- [logging-system.md](docs/logging-system.md): Structured logging utility, levels, conventions
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

- **Single-player wins are never recorded (confirmed bug in `core/`)**: `CombatSimulation.createCombatState` initializes `wonCombat: false` and nothing in the core flow ever sets it — `CombatSimulation.determineCombatOutcome` exists but is never called. `SessionTransitions.transitionAfterCombat` reads `pendingCombatState.wonCombat`, so `end_combat` always records a **loss** in single-player (`LocalServer` → `transitionToNextState`). Reproduced via tsx: outcome log says `player_won`, but `end_combat` yields `wins: 0, losses: 1`. Fix: derive `wonCombat` from the outcome log at the end of `simulateCombat` (wire up `determineCombatOutcome`) and add a regression test.
- **`applyOrb` discards RNG advancement**: `SessionTransitions` passes a throwaway `{ seed: session.seed }` to `OrbAndCoreUpgrades.applyOrb`; the mutated seed is never written back, so consecutive reaction orbs repeat identical "random" picks. Related: `nextRandomValue` (returns seed) vs `pickRandom` (mutates rng) have inconsistent contracts.
- **`createCombatState.initialUnits` aliases `units`**: same array/object references, so the "used to reset board for replays" snapshot is mutated during simulation. Should be a separate clone.
- **Supabase edge handler drift**: `phaser/supabase/functions/action/index.ts` calls `GameLogic.transitionToNextState(session, actionId, payload, options)` (4 args) and reads `transitionResult.combatResult`, but current core `transitionToNextState(session, action)` returns `{ session, combatState? }`. Committed `_shared.js` bundles (Jul 18) predate core changes (Jul 24); re-running `bundle:edge` without updating the handler will break the MP action path.
- **`SessionTransitions.pendingCombatState`** is a module-level mutable singleton (the same anti-pattern previously removed from `CombatSystemStates`); thread the combat state through the handler return type instead.
- **Three divergent rank-up formulas**: `RecruitmentActions.recruitUnit` (×1.5, no effect scaling), `Entities/Unit.upgradeUnitData` (source.power × rankMultiplier + effect scaling), `OrbAndCoreUpgrades.applyUpgradeOrb` (×1.75). Unify.
- **`sacrifice_effect_orb`** is defined in `OrbDefinitions` and has UI presentation, but `applyOrb` has no branch for it → silent no-op.
- **`phaser/` test pipelines broken**: `npm test` finds 0 tests in `phaser/src` (CI `unit-tests.yml` red) and Playwright collects 0 e2e specs (broken imports in `e2e/game.e2e.spec.ts` + `testMatch` mismatch). `jest.config.cjs` has stale `moduleNameMapper` entries pointing to deleted dirs. Full fix plan: [code-quality-cleanup.md](docs/code-quality-cleanup.md).
- **Multiplayer backend will be reimplemented**: Supabase edge functions (`phaser/supabase/`), `src/RemoteServer.ts`, `src/lib/supabase.ts`, and `src/Screens/ArenaLobby/` (dead code with a guaranteed crash at `ArenaLobbyScene.ts:471-473`) are all slated for removal/rewrite — do not invest in fixing bugs there; quarantine per the cleanup doc.

## Task Queue

> Pick a task, mark it `[x]` with your agent name and date when done. Add new tasks as discovered.

### High Priority

(None at this time)

### Medium Priority

- [ ] Migrate remaining ~200 `io.xxx` calls across ~30 files to `env.*` / direct Phaser calls
- [ ] Wire the new server-side LLM play service into automated leaderboard match runners

### Low Priority

- [ ] Reorganize project file structure (see TODO.md for proposed layout)

### Completed
- Historical completed entries live in [AGENTS_ARCHIVE.md](AGENTS_ARCHIVE.md).
- Add new completed work there when closing tasks so this file stays focused on active items.
