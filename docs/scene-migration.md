# Scene Migration — decommissioning `@mana/framework`

Status: **complete** (started 2026-09-08; battleground migrated and the
framework deleted 2026-09-10). Every screen is a raw Phaser `ScreenScene`.
`framework/`, `Scenes/LegacyHostScene.ts`, `Scenes/legacyScreens.ts` and the
`@mana/framework` aliases (tsconfig, jest, webpack) are gone.

## Why

`@mana/framework` (`createScreen` / `screenModule` / `createScreenManager`) was
built to patch gaps in Phaser's single-scene setup: listeners dangling and
duplicating across screen restarts. In practice players reported that screen
transitions could stall permanently ("the game will never move to the next
screen unless I skip to the main menu"), and the custom lifecycle had grown its
own failure modes (nav mutex, async teardown ordering, fades whose completion
event never fires).

Raw Phaser scenes remove the whole class of problems: `scene.start(key)` shuts
the outgoing scene down — Phaser destroys its game objects, kills its tweens
and clears its timers — then runs `create()` on the incoming scene. There is
nothing to leak across a restart, so there is no lifecycle layer to maintain.
(One caveat the migration had to handle explicitly: a scene's `events` emitter
is only cleared on scene *destroy*, not on shutdown, so `scene.events.on(...)`
subscriptions must still be removed in `onScreenShutdown()`.)

## Architecture

One Phaser scene per screen (`Scenes/`):

| File | Purpose |
| --- | --- |
| `Scenes/BootScene.ts` | First scene in `main.ts`. Loads every asset once, creates `env`, initialises stores, installs `window.__debug`, wires global game events, then starts the title scene. |
| `Scenes/ScreenScene.ts` | Base class for a screen scene: repoints `env.scene`, emits `GameEvent.screenShown`/`screenHidden`, exposes a `ready` promise and a hang-proof entrance fade. |
| `Scenes/routes.ts` | `Route` / `RouteParams` catalog — a route IS a Phaser scene key. |
| `Scenes/AppRouter.ts` | `go(route, params)` — the replacement for `getScreenManager().go(...)`. |
| `Scenes/PhaseController.ts` | Framework-free phase runner for multi-phase screens (battleground). Pure, unit-tested. |

### One active scene, repointed `env`

~280 call sites read `env.scene`. Rather than thread a scene parameter through
all of them, `ScreenScene.create()` calls `setActiveScene(this)`, and `env`'s
helpers (`time`, `borderedRoundRect`, `centeredRect`, `shader`,
`rectangularDropZone`, fades) read the **live** `env.scene`. `env.state`,
`env.dispatch` and `env.audio` are unchanged single-instance services.

### Navigation (`AppRouter.go`)

- Every route is a Phaser scene key — `scene.start(route, params)`. A screen's
  probe/event name can differ from its key via the `ScreenScene` constructor's
  second argument (route `crystals` → screen `crystal_selection`).
- Requests made while a transition is in flight are **coalesced** to the latest
  target (same semantics as the old nav mutex).
- `go()` resolves once the incoming screen is `ready` (its `buildScreen()` has
  run), restoring the contract callers relied on.
- **Hang-proof fades**: `fadeOut` resolves on `FADE_OUT_COMPLETE` *or* a bounded
  timeout. `env.fadeOut` / `env.fadeIn` are bounded the same way. A fade
  interrupted by a scene restart can no longer strand navigation — the reported
  failure mode.

### Sub-menus and tabs

`TitleScene` keeps its sub-menus (`main`, `singleplayer_submenu`,
`options_submenu`, `language`) as scene-local state rather than framework
phases: `go(phase)` destroys the current menu's elements and builds the next.
`go` / `currentPhase` remain public because the `__debug`/e2e probes use them.
`onScreenShutdown()` resets module-level UI guards (`isOpen` flags, the
how-to-play text ref, the clouds background cache) that Phaser cannot know
about.

`OptionsScene` does the same for its audio/graphics/game tabs. Its deep-link
route param (`go("options", { tab: "graphics" })`) arrives as Phaser scene data
and is read in `buildScreen()` — the raw-scene replacement for the framework's
`mapDeepLink`.

### Phase-based screens (`PhaseController`)

`BattlegroundScene` is a `ScreenScene` whose phases (encounter, shop, combat,
… plus the client-only `combat_victory`/`combat_defeat`) are driven by
`Scenes/PhaseController` — the small framework-free runner that replaced
`createScreen({ phases })`. It keeps exactly the two capabilities a
multi-phase screen needs:

- **Scoped resources**: a handler receives a `PhaseContext`
  (`track` / `listen` / `go` / `events`). Anything it `track`s, `listen`s to, or
  returns (single destroyable or array) is destroyed when the phase ends —
  including async teardown, which the next phase waits for.
- **Serialised transitions**: `go(phase)` runs
  `exit(outgoing) → destroy outgoing → handler → enter(incoming)` on a
  self-healing promise chain, so rapid calls cannot interleave. Errors from a
  handler reject that `go()` but never wedge later ones.

`startPhaseExit()` / `restorePhaseExit()` keep their old meaning: the outgoing
phase's exit animation can run in parallel with a server dispatch
(`beginPhaseTransition` in `BattlegroundScene.ts`), and if that dispatch fails
the UI slides back instead of leaving a blank board.

`dispatchAction` / `finishPhase` / `beginPhaseTransition` / `endPhaseTransition`
/ `restorePhaseExit` stay module-level exports of `BattlegroundScene.ts` because
dozens of components (shop cards, skip buttons, orbs) dispatch through them and
have no scene reference. They delegate to the controller created by the active
scene, and `onScreenShutdown()` clears that reference (plus combat playback
state, `Chara.clearAll()`, board input and the HUD container) so a second
battleground entry starts clean.

### Element lookup without `findTrackedById`

CrystalSelection used to recover its sprite/name/description/pagination dots by
framework element id. The surface-free replacement: the scene builds them once,
holds the references (`CrystalDisplayRefs`) and passes them to
`Effects/updateDisplay` explicitly. Shared selection state lives in
`CrystalSelection/selection.ts` (a leaf module) so the scene, `navigationButtons`
and `Effects/startNewGame` do not form an import cycle. The DOM numpad is torn
down in `onScreenShutdown()` — the framework teardown never did.

The battleground had a single ID lookup: the combat results panel. It is now a
module-level `resultsPanel` reference in `Phases/Combat/handleCombatPhase.ts`,
tracked in the phase scope and destroyed by the Continue handler before the
board is re-summoned.

## Migrating another screen

1. Create `Screens/<Name>/<Name>Scene.ts` extending `ScreenScene`
   (`npm run new:screen -- <Name>` scaffolds it).
2. Build the UI in `buildScreen()`; subscribe to module-level events with
   explicit disposers released in `onScreenShutdown()`.
3. Navigate with `go("route")` from `@Scenes/AppRouter`.
4. Add the route to `Route`/`RouteParams` in `Scenes/routes.ts`.
5. Register the scene class in the `main.ts` scene list.
6. If the screen has phases, drive them with `Scenes/PhaseController` (or
   scene-local `go(phase)` state for simple sub-menus).

## What the decommission removed

- `framework/` (the `@mana/framework` package) and its aliases in
  `phaser/tsconfig.json`, `phaser/jest.config.cjs`, `phaser/webpack/config.base.cjs`
  and the root `format` scripts.
- `Scenes/LegacyHostScene.ts`, `Scenes/legacyScreens.ts` and the
  `LEGACY_ROUTES` / `LEGACY_HOST_KEY` plumbing in `routes.ts` / `AppRouter.ts`.
- The `BattlegroundScreen.ts` legacy module — superseded by
  `Battleground/BattlegroundScene.ts`.

`GameEvent` stays: it carries global, plain-data events (`screenShown`,
`localeChanged`, …) and was never part of the screen framework.
