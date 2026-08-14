# Mana Battle — Copilot Instructions

Mana Battle is a PVE trigger-based autobattler on a 3×3 board, built with **Phaser 3 + TypeScript**, packaged with Electron (desktop) and Capacitor (Android).

Code lives in two places: the client in `phaser/` and the pure game-logic package in `core/` (consumed via the `@game/*` alias). Run client commands from `phaser/`.

## Commands

```bash
# phaser/
npm run dev             # webpack-dev-server at http://localhost:8080
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit (client, incl. @game/* resolution)
npm run typecheck:core  # core package typecheck
npm run build           # production webpack build
npm test                # ⚠️ jest — currently finds no tests (docs/code-quality-cleanup.md §1)
npm run test:e2e        # ⚠️ playwright — currently collects 0 specs (same doc)

# core/
npm test                # jest — full deterministic suite
npm run typecheck
```

## Architecture

### Layout

| Location | Purpose |
|---|---|
| `core/src/` | Pure game logic (zero Phaser/DOM/Node): `Combat/`, `TriggerSystem/`, `Entities/`, `data/BaseCollection.ts`, `SessionManagement.ts`, `session/SessionTransitions.ts`, `board/`, `math/`, `types/` |
| `phaser/src/Client.ts` | The single Phaser scene; `switchScreen()` navigates between screens |
| `phaser/src/Screens/` | Screens: `Title/`, `CrystalSelection/`, `Battleground/` (phase loop + `Phases/`), `Options/` |
| `phaser/src/Components/` | Reusable widgets (Board, Button, Slider, Tooltip, Modal, Panel, ...) |
| `phaser/src/Systems/` | `Chara/` unit rendering, `AudioManager.ts`, `AchievementSystem.ts` |
| `phaser/src/Models/` | Client-side state (`ClientState.ts`, `OptionsStore.ts`, ...) |
| `phaser/src/FX/` | Visual effect primitives |
| `phaser/src/Storage/` | Storage provider pattern (Steam Cloud / localStorage) |
| `phaser/src/i18n/` | Locales: en, es, pt, jp, cn, ru |

### Purity boundary

`core/` imports nothing from `phaser/` — no Phaser, DOM, or Node APIs. Breaking this breaks headless simulation and replay. See `docs/purity-boundary.md`.

### Combat playback pipeline

Combat is simulated to completion in `core/` (`Combat/CombatSimulation.ts` → typed `CombatLogEntry[]`), then the client plays the logs back: `Screens/Battleground/Phases/Combat/CombatPlaybackController.ts` → `logHandlers/` → `FX/`. State mutation and visual playback are separate concerns.

### Server adapter

Single-player and multiplayer go through the `ServerAdapter` interface: `getServer()` in `phaser/src/GameServer.ts` → `LocalServer.ts` (in-process single-player) or `RemoteServer.ts` (HTTP adapter for the Node backend in `server/`, bearer-token auth, `CombatStateDto` decoding via the core codec — see `docs/game-server.md`). The Supabase path (`phaser/supabase/`) was deleted 2026-08-13.

### Key conventions

- **Functional style**: plain objects + pure functions for game logic; classes only where Phaser requires them. No inheritance chains outside Phaser.
- **`Env` singleton** (`phaser/src/Env.ts`): the application shell — `state`, `dispatch`, `time`, `audio`, Phaser access. Session writes go through the server adapter / `env.updateState`, never direct mutation.
- **Typed events**: `Event<T>` from `core/src/Event.ts` and `phaser/src/Events.ts`; no string-based event bus.
- **Deep-clone effects on init**: unit `effects`/`reactions` are `JSON.parse(JSON.stringify(...))` clones of the card definitions.
- **Exhaustive switch checks**: end switches over discriminated unions with `const _exhaustiveCheck: never = x;`.

## Documentation

See [AGENTS.md](../AGENTS.md) for the knowledge index, current issues, and task queue. Detailed docs live in `docs/` — consult before changing a system.
