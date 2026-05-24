# Mana Battle — Copilot Instructions

Mana Battle is a PVE trigger-based autobattler on a 3×3 board, built with **Phaser 3 + TypeScript**, packaged with Electron (desktop) and Capacitor (Android).

All application code lives under `phaser/src/`. Run all commands from `phaser/`.

## Commands

```bash
npm run dev          # webpack-dev-server at http://localhost:8080
npm test             # Jest unit tests
npm run test:unit    # Jest, excluding e2e
npm run test:e2e     # Playwright end-to-end
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # Production webpack build
```

**Run a single test file:**
```bash
npx jest path/to/file.test.ts
# or with a name pattern:
npx jest --testNamePattern="my test name"
```

**Check unit balance after card changes:**
```bash
npm run check-balance -- --filter
```

## Architecture

### Purity Boundary
`Core/` contains **pure game logic with zero Phaser dependencies**. Nothing in `Core/` may import from Phaser or from `Engine/Scenes/`. Violating this breaks server-side headless simulation and replay.

### Source Layout

| Directory | Key files | Purpose |
|---|---|---|
| `Core/` | `LocalServerAdapter.ts`, `GameLogic.ts`, `IGameServer.ts`, `PhaseSystem/` | Pure game logic: session management, phase transitions, server adapters |
| `Engine/Scenes/Battleground/` | `PhaseManager.ts`, `RunCombatCore.ts`, `CombatPlaybackController.ts` | Phaser scene orchestration, combat playback |
| `Systems/` | `CombatPhase.ts`, `AudioManager.ts`, `AchievementSystem.ts`, `Chara/`, `Shop/`, `Encounter.ts` | Gameplay systems: combat, shop, audio, achievements |
| `Models/` | `Entities/Unit.ts`, `Entities/Card.ts`, `Board.ts`, `BoardLogic.ts`, `State.ts` | Data types and board logic |
| `TriggerSystem/` | `TriggerSystem.ts` | Action-Reaction effect engine |
| `Data/` | `BaseCollection.ts` | Card/unit definitions |
| `UI/` | | UI components |
| `Effects/` | | Visual effect pipeline |
| `Storage/` | `StorageFactory.ts`, `SteamCloudProvider.ts`, `LocalStorageProvider.ts` | Save data (Steam Cloud / localStorage provider pattern) |
| `i18n/` | `i18n.ts`, `*.json` | Localization (en, es, pt, jp, cn, ru) |
| `Multiplayer/` | `MultiplayerManager.ts` | Multiplayer manager |

### Combat Playback Pipeline
Combat runs **server-side (headless)** then the client plays back the log:
```
RunCombatIO.ts → serverCombatDemo.ts → CombatPlaybackController.ts
```
The server-side simulation produces `CombatLogEntry[]`; the client consumes those logs to drive animations. The actual game state mutation and the visual playback are separate concerns.

### IGameServer / ServerFactory (OUTDATED)
Single-player and multiplayer share the same `IGameServer` interface (`Core/IGameServer.ts`). Use `getServerAdapter()` from `Core/ServerFactory.ts` to get the correct adapter — never instantiate `LocalServer` or `RemoteServer` directly.

### Phase System
New handler-based system lives in `Core/PhaseSystem/`. Each game phase has a `PhaseHandler` (see `types.ts` for the interface). Create handlers with `createPhaseHandler()` from `BasePhaseHandler.ts` — don't implement the interface manually. The legacy `PhaseManager.ts` in `Engine/Scenes/Battleground/` still drives the main loop.

### Trigger System
Units have:
- **`effects`** — periodic actions fired on the unit's cooldown (e.g., `damage`, `heal`, `shield`)
- **`reactions`** — responses triggered when *another* unit fires an effect matching a pattern

`TriggerSystem.ts` → `processEffectsIO` → dispatches to `effects/*` modules, then calls `processReactions` for the whole board. Reactions are **not** re-triggered recursively (the `isReaction` flag prevents it).

### Card → Unit Relationship
`CardDefinition` objects in `Data/BaseCollection.ts` are the static definitions. At runtime, `createUnitFromCardSpec()` deep-clones effects/reactions into a live `Unit` object. Never mutate the card definition; always mutate the unit copy.

## Path Aliases

Defined in `tsconfig.json` and webpack config. Key aliases:

| Alias | Maps to |
|---|---|
| `@Core/*` | `src/Core/*` |
| `@Models/*` | `src/Models/*` |
| `@Screens/*` | `src/Engine/Scenes/*` |
| `@Systems/*` | `src/Systems/*` |
| `@TriggerSystem/*` | `src/TriggerSystem/*` |
| `@Utils/*` | `src/Utils/*` |
| `@UI/*` | `src/UI/*` |
| `@Data/*` | `src/Data/*` |
| `@i18n/*` | `src/i18n/*` |

## Key Conventions

- **Functional style**: plain objects + pure functions for all game logic. Classes only where Phaser requires it (scenes, game objects). No inheritance chains outside Phaser.
- **`IO` suffix**: functions with side effects (Phaser calls, logging, timers) are named with an `IO` suffix (e.g., `processEffectsIO`, `runCombatIO`). Pure logic functions have no suffix.
- **Logger**: always use `createLogger("ScopeName")` from `@Utils/Logger` instead of `console.*`. Log level defaults to `debug` in dev, `warn` in production; can be overridden via `localStorage.setItem("mana_log_level", "debug")`.
- **Deep-clone effects on init**: unit `effects` and `reactions` are always `JSON.parse(JSON.stringify(...))` cloned from card definitions so mutations don't bleed back to the source data.
- **Exhaustive switch checks**: switch statements over discriminated unions end with `const _exhaustiveCheck: never = x; return _exhaustiveCheck;` to catch unhandled cases at compile time.
- **Card balance**: when adding or modifying cards in `BaseCollection.ts`, run `npm run check-balance` and consult `docs/unit-balance.md` for the power budget and cost formulas.

## Documentation

Detailed docs in `docs/` — consult before changing a system:

- `battle-system.md` — phase management, combat flow
- `combat-architecture.md` — client-server separation, playback
- `trigger-system.md` — Action-Reaction model
- `purity-boundary.md` — what is and isn't allowed in `Core/`
- `unit-balance.md` — power budget, cost formulas
- `phase-system-refactoring.md` — PhaseHandler architecture
- `storage-system.md` — provider pattern, Steam Cloud
- `logging-system.md` — logger conventions
