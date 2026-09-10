# Mana Battle — Phaser Client

The Phaser 3 game client for Mana Battle: screens, UI, audio, combat playback,
and the server adapters. Game rules live in `core/` (`@game/*`); screen
lifecycle/navigation are raw Phaser scenes (`src/Scenes/ScreenScene.ts`,
`src/Scenes/AppRouter.ts`). The client is a thin engine layer on top.

## Quick Start

```bash
cd phaser
npm install
npm run dev        # http://localhost:8080
```

## Key entry points

- `src/Scenes/BootScene.ts` — boot: wires `env.dispatch` → `GameServer.getServer().handleAction`, store/event setup, starts `title`
- `src/main.ts` — entry point
- `src/Scenes/AppRouter.ts` — `go(route, params)` screen navigation
- `src/Screens/Battleground/BattlegroundScene.ts` — the main game loop (phases driven by `Scenes/PhaseController.ts`)
- `src/GameServer.ts` — `getServer()` picks `LocalServer` (single-player) or `remoteServer` (multiplayer)

## Layout

- `src/Screens/` — screen modules (Title, CrystalSelection, Options, Battleground)
- `src/Components/` — shared Phaser widgets (Button, Slider, Tooltip, Chara, Board, …)
- `src/Systems/` — AudioManager, AchievementSystem (Steam adapter), Storage (provider pattern)
- `src/Models/` — thin client wrappers (OptionsStore, StatsStore, ClientState)
- `src/FX/`, `src/i18n/` (JSON catalogs only), `src/lib/` (steamAuth)

## Commands

| Command                    | Description                          |
|----------------------------|--------------------------------------|
| `npm run dev`              | dev server (hot reload) on :8080     |
| `npm run build`            | production webpack build → `dist/`   |
| `npm run test:ci`          | jest unit tests                      |
| `npm run typecheck`        | `tsc --noEmit`                       |
| `npm run lint`             | eslint                               |
| `npm run new:screen -- <Name>` | scaffold a new screen module     |

E2E (`npm run test:e2e`) is currently broken — see [AGENTS.md](AGENTS.md).

## Docs

- [AGENTS.md](AGENTS.md) — agent guide (layout, conventions, gotchas)
- [docs/ui-system.md](../docs/ui-system.md) · [docs/effect-system.md](../docs/effect-system.md) · [docs/combat-architecture.md](../docs/combat-architecture.md) · [docs/battle-system.md](../docs/battle-system.md)