# AI Agent Guide — `phaser/`

The Phaser 3 game client. A thin engine layer over `core/` (game rules); its
screen/nav layer is migrating from `framework/` to raw Phaser scenes. **Game
rules belong in `core/`, not here** — see [purify.md](../purify.md) and
[core/AGENTS.md](../core/AGENTS.md).

## Layout

- `src/Scenes/` — **scene infrastructure (the new screen layer)**: `BootScene.ts` (loads assets, creates `env`, installs `window.__debug`, starts `title`), `ScreenScene.ts` (base class for a screen scene), `AppRouter.ts` (`go(route, params)` navigation), `routes.ts`, and the temporary `LegacyHostScene.ts` + `legacyScreens.ts` bridge for not-yet-migrated screens. See [docs/scene-migration.md](../docs/scene-migration.md)
- `src/main.ts` — entry; registers the scene list; `src/config.ts` — `GAME_CONFIG`
- `src/Env.ts` — the `env` singleton (state, active scene, dispatch, updateState). `env.scene` points at the *active* screen scene and is repointed by `ScreenScene.create()`
- `src/GameServer.ts` — `getServer()` → `LocalServer` (single-player) or `remoteServer` (multiplayer); `src/LocalServer.ts`, `src/RemoteServer.ts`
- `src/Events.ts` — `GameEvent` (global, plain data only) + `BattlegroundEvent` (screen-scoped)
- `src/Screens/` — screen modules. `Title/TitleScene.ts` is a raw `ScreenScene`; CrystalSelection, Options, Battleground, MultiplayerLobby and MultiplayerLogin are still legacy `@mana/framework` modules hosted by `LegacyHostScene`
- `src/Screens/Battleground/` — the main loop: `BattlegroundScreen.ts` declares phases via `createScreen({ phases })`; `Phases/` has one dir per phase; `Components/` renders HUD/board/shop
- `src/Components/` — shared Phaser widgets (Button, Slider, Tooltip, Modal, Panel, Chara, Board, CloudsBackground, …)
- `src/Systems/` — AudioManager, AchievementSystem (Steam adapter), Storage (provider pattern)
- `src/FX/`, `src/i18n/` (JSON catalogs only — engine is in core), `src/lib/` (steamAuth), `src/Models/` (thin wrappers, e.g. OptionsStore)

## Screen authoring

Canonical pattern (migrated screens): `npm run new:screen -- <Name>` scaffolds
a `ScreenScene`; extend `ScreenScene`, build UI in `buildScreen()`, reset
module-level state in `onScreenShutdown()`, add the route to
`src/Scenes/routes.ts` and the scene class to the `main.ts` scene list. Navigate
with `go(route, params)` from `@Scenes/AppRouter`.

Legacy screens still use `createScreen()` from `@mana/framework` — see
[../framework/AGENTS.md](../framework/AGENTS.md) — and must be migrated with the
checklist in [docs/scene-migration.md](../docs/scene-migration.md).

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
- **Never capture `env.scene` in a module-level variable** — it is repointed on
  every screen entry. Read it inside functions, as the shared components do.
- Migrated scenes: reset module-level state (flags, DOM nodes, `@game` event
  subscriptions) in `onScreenShutdown()`. Legacy framework screens run inside
  `LegacyHostScene`, so `Phaser.Scenes.Events.SHUTDOWN` does **not** fire for
  them — keep explicit teardown in `destroy()`.
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