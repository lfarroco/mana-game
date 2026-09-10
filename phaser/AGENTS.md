# AI Agent Guide — `phaser/`

The Phaser 3 game client. A thin engine layer over `core/` (game rules); its
screen/nav layer is raw Phaser scenes (`ScreenScene` / `AppRouter`). **Game
rules belong in `core/`, not here** — see [purify.md](../purify.md) and
[core/AGENTS.md](../core/AGENTS.md).

## Layout

- `src/Scenes/` — **scene infrastructure (the screen layer)**: `BootScene.ts` (loads assets, creates `env`, installs `window.__debug`, starts `title`), `ScreenScene.ts` (base class for a screen scene), `AppRouter.ts` (`go(route, params)` navigation), `routes.ts`, and `PhaseController.ts` (framework-free phase runner for multi-phase screens). See [docs/scene-migration.md](../docs/scene-migration.md)
- `src/main.ts` — entry; registers the scene list; `src/config.ts` — `GAME_CONFIG`
- `src/Env.ts` — the `env` singleton (state, active scene, dispatch, updateState). `env.scene` points at the *active* screen scene and is repointed by `ScreenScene.create()`
- `src/GameServer.ts` — `getServer()` → `LocalServer` (single-player) or `remoteServer` (multiplayer); `src/LocalServer.ts`, `src/RemoteServer.ts`
- `src/Events.ts` — `GameEvent` (global, plain data only) + `BattlegroundEvent` (screen-scoped)
- `src/Screens/` — screen modules. Title, Options, CrystalSelection, MultiplayerLogin, MultiplayerLobby and Battleground are all raw `ScreenScene`s
- `src/Screens/Battleground/` — the main loop: `BattlegroundScene.ts` declares its phases as a `PhaseEntry` map driven by `Scenes/PhaseController`; `Phases/` has one dir per phase; `Components/` renders HUD/board/shop
- `src/Components/` — shared Phaser widgets (Button, Slider, Tooltip, Modal, Panel, Chara, Board, CloudsBackground, …)
- `src/Systems/` — AudioManager, AchievementSystem (Steam adapter), Storage (provider pattern)
- `src/FX/`, `src/i18n/` (JSON catalogs only — engine is in core), `src/lib/` (steamAuth), `src/Models/` (thin wrappers, e.g. OptionsStore)

## Screen authoring

Canonical pattern: `npm run new:screen -- <Name>` scaffolds a `ScreenScene`;
extend `ScreenScene`, build UI in `buildScreen()`, reset module-level state in
`onScreenShutdown()`, add the route to `src/Scenes/routes.ts` and the scene class
to the `main.ts` scene list. Navigate with `go(route, params)` from
`@Scenes/AppRouter`. Screens with mutually exclusive view states (battleground)
drive them with `Scenes/PhaseController`; simple sub-menus/tabs keep their own
scene-local `go(phase)` state (`TitleScene`, `OptionsScene`).

The incoming screen starts black (`ScreenScene` covers the camera) and fades in
once `buildScreen()` resolves. If the build has slow async work *after* the
visible layer is up, call `this.revealScreen()` first — it is idempotent, so the
automatic reveal no-ops. `BattlegroundScene` does this so the ~2s team-summon
animation doesn't hold the player on black.

## Battleground phases

`BattlegroundScene.ts` declares every phase as a `PhaseEntry` (`{ handler,
transition? }`) and hands them to `createPhaseController`. A handler receives a
`BGContext` (`track` / `listen` / `go` / `events`); whatever it returns or
tracks is destroyed when the phase ends. `dispatchAction` / `finishPhase` are
the canonical transition helpers. Combat playback:
`Phases/Combat/handleCombatPhase.ts` → `CombatPlaybackController.ts` (see
[docs/combat-architecture.md](../docs/combat-architecture.md)).

## Gotchas

- Battleground screens/phases dispatch via `env.dispatch` — never import
  `src/GameServer.ts` directly.
- **Never capture `env.scene` in a module-level variable** — it is repointed on
  every screen entry. Read it inside functions, as the shared components do.
- `Phaser` is a **global installed as a side effect of importing the `phaser`
  package** (the client never sets it up explicitly). A module that uses it at
  module-evaluation time — e.g. `extends Phaser.Scene`, as `ScreenScene` does —
  must import it (`import * as Phaser from "phaser"`), otherwise the bundle's
  module order decides whether it is defined yet.
- A scene's `events` emitter is **not** cleared on shutdown (only on scene
  destroy): remove any `scene.events.on(...)` subscription in
  `onScreenShutdown()` and capture the emitter at registration time (see the
  combat playback loop in `Phases/Combat/handleCombatPhase.ts`).
- Scenes must reset module-level state (flags, DOM nodes, `@game` event
  subscriptions) in `onScreenShutdown()`; Phaser destroys the game objects, not
  your module variables. `BattlegroundScene` also clears its module-level phase
  controller, combat playback state and `Chara` registry there.
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