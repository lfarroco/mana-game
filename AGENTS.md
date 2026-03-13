# AI Agent Guide — Mana Battle

This file is the entry point for AI agents working on the Mana Battle codebase. Read this first to orient yourself, then pick a task and get to work. **Update this file when you complete a task or discover new issues.**

The file plan.md contains the overall project plan and roadmap, including tasks that are currently in progress, completed, or planned for future development.

## Agent Workflow

1. **Read this file** to orient yourself.
2. **Pick a task** from the Task Queue.
3. **Read the relevant docs** from the Knowledge Index.
4. **Check the coding standards** before writing code.
5. **Implement the change**, including tests where appropriate.
6. **Update this file**: mark the task done, move to Completed, note any new issues discovered.

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

## Knowledge Index

### Architecture & Source Layout

All application code lives under `phaser/src/`:

| Directory        | Purpose                                       | Key Files                                                                                                   |
|------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `Core/`          | Pure game logic, no Phaser deps               | `LocalServerAdapter.ts`, `GameLogic.ts`, `IGameServer.ts`, `PhaseSystem/`                                   |
| `Engine/Scenes/` | Phaser scene orchestration                    | `Battleground/PhaseManager.ts`, `Battleground/RunCombatCore.ts`, `Battleground/CombatPlaybackController.ts` |
| `Systems/`       | Gameplay systems (combat, shop, board, audio) | `CombatPhase.ts`, `AudioManager.ts`, `AchievementSystem.ts`, `Chara/`, `Shop/`, `Encounter.ts`              |
| `Models/`        | Data models and board logic                   | `Entities/Unit.ts`, `Entities/Card.ts`, `Board.ts`, `BoardLogic.ts`, `State.ts`                             |
| `TriggerSystem/` | Action-Reaction effect engine                 | `TriggerSystem.ts`                                                                                          |
| `Multiplayer/`   | Multiplayer manager & logic                   | `MultiplayerManager.ts`                                                                                     |
| `Storage/`       | Save data (Steam Cloud / localStorage)        | `StorageFactory.ts`, `SteamCloudProvider.ts`, `LocalStorageProvider.ts`                                     |
| `i18n/`          | Localization (en, es, pt, jp, cn, ru)         | `i18n.ts`, `*.json`                                                                                         |
| `Data/`          | Card/unit definitions                         | `BaseCollection.ts`                                                                                         |
| `UI/`            | UI components                                 | —                                                                                                           |
| `Effects/`       | Visual effects                                | —                                                                                                           |

### Documentation Index

Detailed docs live in `docs/`. Each covers a specific system:

| Doc                                                                         | Covers                                                      |
|-----------------------------------------------------------------------------|-------------------------------------------------------------|
| [building-and-running.md](docs/building-and-running.md)                     | Setup, all npm scripts, platform requirements               |
| [battle-system.md](docs/battle-system.md)                                   | Phase management, combat flow, board logic                  |
| [combat-architecture.md](docs/combat-architecture.md)                       | Client-server combat separation, playback system            |
| [trigger-system.md](docs/trigger-system.md)                                 | Action-Reaction model, effects, targeting                   |
| [character-unit-system.md](docs/character-unit-system.md)                   | Unit/Card types, Chara rendering system                     |
| [unit-balance.md](docs/unit-balance.md)                                     | Power budget, cost formulas, trigger frequencies            |
| [phase-system-refactoring.md](docs/phase-system-refactoring.md)             | New PhaseSystem handler architecture                        |
| [single-multiplayer-unification.md](docs/single-multiplayer-unification.md) | IGameServer interface, LocalServerAdapter, unification plan |
| [multiplayer-architecture.md](docs/multiplayer-architecture.md)             | MultiplayerManager, server-driven phases                    |
| [server-side-combat-migration.md](docs/server-side-combat-migration.md)     | Headless combat simulation (completed)                      |
| [storage-system.md](docs/storage-system.md)                                 | Provider pattern, Steam Cloud, localStorage                 |
| [audio-system.md](docs/audio-system.md)                                     | Music, SFX, cooldowns, user preferences                     |
| [ui-system.md](docs/ui-system.md)                                           | UI components, event handling, layout management            |
| [effect-system.md](docs/effect-system.md)                                   | Visual effect pipeline, particles, and combat integration   |
| [options-system.md](docs/options-system.md)                                 | Options data model, persistence, UI bindings                |
| [supabase-backend.md](docs/supabase-backend.md)                             | Supabase Edge Functions and Steam auth backend              |
| [logging-system.md](docs/logging-system.md)                                 | Structured logging utility, levels, conventions             |
| [localization.md](docs/localization.md)                                     | i18n, adding languages, fallback logic                      |
| [achievement-system.md](docs/achievement-system.md)                         | Steam achievements, victory tiers                           |

### Key Architectural Patterns

1. **Combat Playback**: Combat is simulated server-side → produces logs → client plays back animations. Entry: `RunCombatIO.ts` → `serverCombatDemo.ts` → `CombatPlaybackController.ts`.
2. **Server Adapter**: Single-player and multiplayer both go through `IGameServer` interface. `getServerAdapter()` in `Core/ServerFactory.ts` returns the right adapter.
3. **Phase System**: New handler-based system in `Core/PhaseSystem/` with `PhaseHandler` interface. Legacy `PhaseManager.ts` in `Engine/Scenes/Battleground/` still runs the main loop.
4. **Trigger System**: Units have `effects` (actions on cooldown) and `reactions` (responses to other units' effects). Defined in `TriggerSystem/TriggerSystem.ts`.

## Current Issues

> Update this section as you find or fix bugs.

- [ ] Legacy `PhaseManager.ts` still runs the main game loop — new `Core/PhaseSystem/` handlers are registered but not fully migrated
- [x] `MultiplayerManager` was a singleton class — converted to functional module

## Task Queue

> Pick a task, mark it `[x]` with your agent name and date when done. Add new tasks as discovered.

### High Priority

- [ ] Complete migration from legacy `PhaseManager.ts` to `Core/PhaseSystem/` handler architecture
- [ ] Have the multiplayer handler be used locally in single player mode (from TODO.md)

### Medium Priority

- [x] Document the UI System (components, layout management)
- [x] Document the Effect System (visual effects, particles)
- [x] Document the Options/Preferences System (user settings)
- [x] Document Supabase Backend (Edge Functions, Steam auth, deployment)
- [x] Implement smooth fade-in/out using Phaser tweens in `AudioManager.ts` (currently uses `setTimeout` delays)
- [x] Add pre-commit hooks (Husky + lint-staged + typecheck)

### Low Priority

- [ ] Reorganize project file structure (see TODO.md for proposed layout)
- [ ] Replace `MultiplayerManager` singleton with a functional module
- [x] Evaluate if Node.js engine requirement should be formally set in `package.json`

### Completed
- Historical completed entries were moved to [AGENTS_ARCHIVE.md](AGENTS_ARCHIVE.md) on 2026-03-13.
- Keep only recent or in-progress-relevant completions in this section going forward.
- [x] Documented Supabase backend architecture and operations in `docs/supabase-backend.md` (Copilot, 2026-03-13)
- [x] Improved webpack hot reload speed via filesystem cache and faster ts-loader watch mode in `webpack/config.dev.cjs` and `webpack/config.debug.cjs` (Copilot, 2026-03-13)
