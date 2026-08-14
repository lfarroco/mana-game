# AI Agent Guide — `phaser/`

The Phaser 3 game client. A thin engine layer over `core/` (game rules) and
`framework/` (screens/nav). **Game rules belong in `core/`, not here** — see
[purify.md](../purify.md) and [core/AGENTS.md](../core/AGENTS.md).

## Layout

- `src/Client.ts` — boot: wires `env.dispatch` → `GameServer.getServer().handleAction`, screen registry, global events
- `src/main.ts` — entry; `src/config.ts` — `GAME_CONFIG`
- `src/Env.ts` — the `env` singleton (state, scene, dispatch, updateState)
- `src/GameServer.ts` — `getServer()` → `LocalServer` (single-player) or `remoteServer` (multiplayer); `src/LocalServer.ts`, `src/RemoteServer.ts`
- `src/Events.ts` — `GameEvent` (global, plain data only) + `BattlegroundEvent` (screen-scoped)
- `src/Screens/` — screen modules (Title, CrystalSelection, Options, Battleground) + `ScreenManager.ts` (typed `Routes`)
- `src/Screens/Battleground/` — the main loop: `BattlegroundScreen.ts` declares phases via `createScreen({ phases })`; `Phases/` has one dir per phase; `Components/` renders HUD/board/shop
- `src/Components/` — shared Phaser widgets (Button, Slider, Tooltip, Modal, Panel, Chara, Board, CloudsBackground, …)
- `src/Systems/` — AudioManager, AchievementSystem (Steam adapter), Storage (provider pattern)
- `src/FX/`, `src/i18n/` (JSON catalogs only — engine is in core), `src/lib/` (steamAuth), `src/Models/` (thin wrappers, e.g. OptionsStore)

## Screen authoring

Canonical pattern: `npm run new:screen -- <Name>`, then register the route in
`src/Screens/ScreenManager.ts` (`Routes`) and the screen in `src/Client.ts`.
Screens use `createScreen()` from `@mana/framework` — see
[../framework/AGENTS.md](../framework/AGENTS.md).

## Battleground phases

`BattlegroundScreen.ts` declares every phase directly in
`createScreen({ phases })`; each handler returns a `Destroyable`, and the
framework auto-destroys tracked elements on phase switch. `dispatchAction` /
`finishPhase` are the canonical transition helpers. Combat playback:
`Phases/Combat/handleCombatPhase.ts` → `CombatPlaybackController.ts` (see
[docs/combat-architecture.md](../docs/combat-architecture.md)).

## Gotchas

- Battleground screens/phases dispatch via `env.dispatch` — never import
  `src/GameServer.ts` directly.
- DOM elements created by screens must be cleaned in the screen's `destroy()`
  (module-level refs); never rely on `Phaser.Scenes.Events.SHUTDOWN`.
- The e2e suite is **broken** (missing `src/test-utils/debugController`) — use
  jest unit tests (`npm run test:ci`).
- Empty scaffold files sometimes survive refactors — if you find a 0-byte
  `.ts` file, check for usages before assuming it matters.

## Verification

```bash
cd phaser
npm run test:ci     # jest --ci (unit tests)
npm run typecheck
npm run lint
```

Single file: `npx jest src/path/File.test.ts --runInBand`.