# Scene Migration — decommissioning `@mana/framework`

Status: **in progress** (started 2026-09-08). Migrated: **title**, **options**,
**crystals** (`CrystalSelectionScene`), **multiplayer_login**,
**multiplayer_lobby**. Remaining on the legacy framework: **battleground**.

## Why

`@mana/framework` (`createScreen` / `screenModule` / `createScreenManager`) was
built to patch gaps in Phaser's single-scene setup: listeners dangling and
duplicating across screen restarts. In practice players reported that screen
transitions could stall permanently ("the game will never move to the next
screen unless I skip to the main menu"), and the custom lifecycle had grown its
own failure modes (nav mutex, async teardown ordering, fades whose completion
event never fires).

Raw Phaser scenes remove the whole class of problems: `scene.start(key)` shuts
the outgoing scene down — Phaser destroys its game objects, tweens, timers and
`this.events` listeners — then runs `create()` on the incoming scene. There is
nothing to leak across a restart, so there is no lifecycle layer to maintain.

## Architecture

One Phaser scene per screen (`Scenes/`):

| File | Purpose |
| --- | --- |
| `Scenes/BootScene.ts` | First scene in `main.ts`. Loads every asset once, creates `env`, initialises stores, installs `window.__debug`, wires global game events, then starts the title scene. |
| `Scenes/ScreenScene.ts` | Base class for a screen scene: repoints `env.scene`, emits `GameEvent.screenShown`/`screenHidden`, exposes a `ready` promise and a hang-proof entrance fade. |
| `Scenes/routes.ts` | `Route` / `RouteParams` catalog, `LEGACY_ROUTES`, `LEGACY_HOST_KEY`. |
| `Scenes/AppRouter.ts` | `go(route, params)` — the replacement for `getScreenManager().go(...)`. |
| `Scenes/LegacyHostScene.ts` | Transitional Phaser scene hosting the not-yet-migrated framework screens. |
| `Scenes/legacyScreens.ts` | The legacy `createScreenManager` instance + the `LegacyNavigator` bridge. |

### One active scene, repointed `env`

~280 call sites read `env.scene`. Rather than thread a scene parameter through
all of them, `ScreenScene.create()` calls `setActiveScene(this)`, and `env`'s
helpers (`time`, `borderedRoundRect`, `centeredRect`, `shader`,
`rectangularDropZone`, fades) read the **live** `env.scene`. `env.state`,
`env.dispatch` and `env.audio` are unchanged single-instance services.

### Navigation (`AppRouter.go`)

- Migrated routes (*all except `battleground`*) **are** Phaser scene keys —
  `scene.start(route, params)`. A screen's probe/event name can differ from its
  key via the `ScreenScene` constructor's second argument (route `crystals` →
  screen `crystal_selection`).
- Legacy routes start `LegacyHostScene` with `{ route, params }`; when that host
  is already active the request is delegated to the legacy manager, which keeps
  owning its own sub-screen navigation.
- Requests made while a transition is in flight are **coalesced** to the latest
  target (same semantics as the old nav mutex).
- `go()` resolves once the incoming screen is `ready` (its `buildScreen()` has
  run), restoring the contract callers relied on.
- **Hang-proof fades**: `fadeOut` resolves on `FADE_OUT_COMPLETE` *or* a bounded
  timeout. `env.fadeOut` / `env.fadeIn` are bounded the same way, so the legacy
  bridge's transitions benefit too. A fade interrupted by a scene restart can no
  longer strand navigation — the reported failure mode.

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

### Element lookup without `findTrackedById`

CrystalSelection used to recover its sprite/name/description/pagination dots by
framework element id. The surface-free replacement: the scene builds them once,
holds the references (`CrystalDisplayRefs`) and passes them to
`Effects/updateDisplay` explicitly. Shared selection state lives in
`CrystalSelection/selection.ts` (a leaf module) so the scene, `navigationButtons`
and `Effects/startNewGame` do not form an import cycle. The DOM numpad is torn
down in `onScreenShutdown()` — the framework teardown never did.

## Migrating another screen

1. Create `Screens/<Name>/<Name>Scene.ts` extending `ScreenScene`
   (`npm run new:screen -- <Name>` scaffolds it).
2. Build the UI in `buildScreen()`; subscribe to module-level events with
   explicit disposers released in `onScreenShutdown()`.
3. Navigate with `go("route")` from `@Scenes/AppRouter`.
4. Add the route to `Route`/`RouteParams` in `Scenes/routes.ts`.
5. Register the scene class in the `main.ts` scene list.
6. Remove the route from `LEGACY_ROUTES` and from `legacyScreens.ts`.

## When the last screen moves

Delete `Scenes/LegacyHostScene.ts`, `Scenes/legacyScreens.ts`, the
`LEGACY_ROUTES`/`LEGACY_HOST_KEY` plumbing in `routes.ts`/`AppRouter.ts`, then
the `framework/` package and its `@mana/framework` aliases (tsconfig, webpack,
jest). `GameEvent` stays — it carries global, plain-data events (`screenShown`,
`localeChanged`, …) and is not part of the screen framework.
