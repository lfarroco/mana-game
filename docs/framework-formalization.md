# Framework Formalization (Long-Term Vision)

This document describes the long-term goal of extracting the current
architectural patterns into a formal, reusable **application framework**
for the client layer. It captures what exists today, what's missing, and
the progression toward a first-class framework that can survive Phaser
version bumps, screen additions, and engine swaps.

## Status

**Phase**: Planning / early foundation  
**Depends on**: core migration (see `core/README.md` Phase 1–3)  
**Target**: Post-core-migration, before any new screen type is added  

---

## What Already Exists

The codebase already follows consistent architectural patterns. These are
the building blocks a formal framework would codify.

### Primitives (pure, in `core/`)

| Primitive      | File                     | Description                                                                                                         |
|----------------|--------------------------|---------------------------------------------------------------------------------------------------------------------|
| `Event<T>`     | `core/src/Event.ts`      | Typed, self-contained pub/sub. `listen(…) → disposer`, `emit(payload)`, `clear()`. No EventEmitter, no string keys. |
| `Option<T>`    | `core/src/Functional.ts` | No-null return types for pure functions.                                                                            |
| `Result<T, E>` | `core/src/Functional.ts` | No-throw error handling for pure functions.                                                                         |

### Client runtime (`phaser/src/`)

| Concept                     | File(s)                                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|-----------------------------|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Env` singleton             | `phaser/src/Env.ts`                    | Application shell wrapping Phaser: `scene`, `state`, `dispatch`, `time`, `audio`, `fadeOut`/`fadeIn`, Phaser helpers. Imported as `env` — never null.                                                                                                                                                                                                                                                                                                                                                        |
| Global events               | `phaser/src/Events.ts`                 | `BattlegroundEvent` (phase lifecycle, HUD deltas) and `GameEvent` (screen lifecycle, run lifecycle, domain events). Cross-cutting only. `NavigationEvent` was **removed** (2026-07-31, Cline) — navigation now goes through the ScreenManager.                                                                                                                                                                                                                                                               |
| `createScreen()`            | `phaser/src/Screens/screenTracking.ts` | Screen factory: auto event lifecycle, `ctx.track(obj, { id })` / `ctx.track(objs, { idPrefix })` tracking of destroyables (Phaser objects + wrappers like BackgroundOverlay), persistent layer + mutually exclusive phases with auto-disposal (optional — omit for single-view screens), `ctx.refresh()` to re-run the current phase, `ctx.findById` / `findTrackedById` ID recovery. `screenModule()` helper reduces per-screen export boilerplate to one line. Used by all three non-battleground screens. |
| `createScreenLifecycle()`   | *(removed)*                            | **Deleted** (2026-07-30, Cline). All screens migrated to `createScreen()`; `screenLifecycle.ts` removed.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Screen lifecycle            | All `Screens/*`                        | `name`, `init()` → `create()` → `destroy()`. Idempotent init, re-entrant create.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Screen-local events         | Per-screen modules                     | Each screen defines its own typed events (e.g. `CrystalSelectionEvents`, `OptionsScreenEvents`) scoped to that screen.                                                                                                                                                                                                                                                                                                                                                                                       |
| `ScreenManager` + nav mutex | `phaser/src/Screens/ScreenManager.ts`  | Centralized navigation (Phase C, 2026-07-31): screen registry, active screen tracking, configurable fade transitions, and automatic `screenShown`/`screenHidden` emission. `go(route, params)` is serialised by a promise‑chain mutex that coalesces redundant requests. Registered once at boot via `setScreenManager()` in `Client.ts`.                                                                                                                                                                    |
| Phase handlers              | `Battleground/Phases/`                 | Each phase exports a `PhaseHandler` with `start() → TeardownFn`. BattlegroundScreen guarantees teardown on every transition and on screen destroy.                                                                                                                                                                                                                                                                                                                                                           |

### Three-layer model

```
core/          ← pure game logic, zero deps (can't import from phaser/)
phaser/src/    ← client runtime: screens, UI, audio, playback
server/        ← persistence, validation, networking
```

Import direction is enforced: `core/` never imports from `phaser/` or `server/`.

### The event flow

```
Button Click
    │
    ▼
emit screen-local event ──────► effect listener (screen-internal action)
    │
    ▼
getScreenManager().go(route) ──► ScreenManager transition (cross-screen)
    (typed params, see Phase C)
```

---

## What a Formal Framework Would Add

Today the patterns exist by convention. A framework would make them
**enforceable by tooling.**

### 1. `createScreen()` factory with automatic resource tracking

The biggest source of bugs today is manual cleanup: every screen must track its
disposers, DOM elements, Phaser game objects, and `scene.events` listeners, then
destroy them by hand in `destroy()`. A factory that **tracks resources at
registration time** and disposes them automatically on screen exit eliminates
this class of error entirely.

```typescript
// Conceptual API — a screen module using the factory
import { createScreen } from "@mana/framework";

type MyEvents = {
  buttonClicked: Event<void>;
};

export const { init, create, destroy } = createScreen<MyEvents>("title", (ctx) => {
  // ── Declare events and disposers ──
  const events = {
    buttonClicked: createEvent<void>(),
  };

  ctx.on(events.buttonClicked, () => handleClick());          // typed-event listener
  ctx.on(NavigationEvent.toOptions, handleNavigate);           // global event listener
  ctx.onUpdate((time, delta) => updateAnimation(time, delta)); // scene.events.on("update")

  // ── Return the render function ──
  return (renderCtx) => {
    const titleText = renderCtx.track.text(0, 0, "Hello");      // auto-tracked Phaser object

    const btn = renderCtx.createButton({                       // auto-tracked via ctx helpers
      text: "Click me",
      onClick: () => events.buttonClicked.emit(),
    });

    const domEl = renderCtx.addDom(document.createElement("div")); // auto-removed from DOM
    document.body.appendChild(domEl);

    renderCtx.onDispose(() => { /* custom teardown */ });      // runs on screen exit
  };
});
```

**What the factory manages:**

| Resource                    | Declared via                                      | Disposed by                           |
|-----------------------------|---------------------------------------------------|---------------------------------------|
| Typed-event listeners       | `ctx.on(event, handler)`                          | `disposer()` on each listener         |
| `scene.events.on("update")` | `ctx.onUpdate(handler)`                           | `scene.events.off("update", handler)` |
| Phaser game objects         | `renderCtx.add.text(…)`, `add.container(…)`, etc. | `gameObject.destroy(true)`            |
| DOM elements                | `renderCtx.addDom(node)`                          | `document.body.removeChild(node)`     |
| Custom teardown             | `renderCtx.onDispose(fn)`                         | runs `fn()`                           |

**On navigation (`ScreenManager.go()`):**

1. Emit `GameEvent.screenHidden` → the factory disposes every registered resource
   (listeners, game objects, DOM nodes, scene hooks, custom teardowns).
2. Call screen's `destroy()` (if the screen adds extra work beyond tracked resources).
3. Run the standard scene-cleanup kill list (input disable, fadeOut,
   `children.removeAll(true)`, `tweens.killAll()`, `time.removeAllEvents()`,
   cursor reset).
4. Emit `GameEvent.screenShown`.

At this point, forgetting to clean up a resource is **impossible** — the screen
never holds an `on` reference that outlives the factory. The developer declares
the resource, the framework disposes it. This is the critical improvement over
both the current ad‑hoc system **and** Phaser scenes, because Phaser has no
equivalent for DOM nodes, typed‑event listeners, or `scene.events` hooks —
those still leak across scene transitions.

### 2. `ScreenManager`

Extracted from `Client.ts` into a standalone module. Handles:

- Screen registry (map of screen IDs → ScreenModules)
- Active screen tracking
- Enter/exit transitions (fade, cleanup, init) — driven by `GameEvent.screenShown` / `screenHidden`
- Typed navigation (params per route, see §4)

```typescript
const manager = createScreenManager({
  screens: { title: TitleScreen, battleground: BattlegroundScreen, ... },
  transitions: { fadeMs: 300, color: 0x000000 },
  eventBridge: { shown: GameEvent.screenShown, hidden: GameEvent.screenHidden },
});
manager.go("battleground", { crystalId: "crystal_01" });
```

The former `ScreenRegistry` type and `noopScreens` fallback in `Env.ts`
(removed 2026-07-31 once this shipped) suggest this was anticipated.

### 3. Screen state purity

The factory pattern also solves the state-contamination problem. Today
`CrystalSelectionScreen.state` holds Phaser refs (`crystalSprite: Phaser.GameObjects.Image`).
If the factory manages Phaser objects through `renderCtx.add.text(...)`, the
screen's pure state never needs to reference them:

```typescript
export const { init, create, destroy } = createScreen<...>("crystal_selection", (ctx) => {
  const state = { currentIndex: 0, crystals: Card.getCores() };

  ctx.on(events.crystalChanged, ({ index }) => {
    state.currentIndex = index;
    ctx.rerender();       // ← triggers factory to destroy old objects and re-run render
  });

  return (renderCtx) => {
    const crystal = state.crystals[state.currentIndex];
    renderCtx.add.image(/* ... */);     // no ref stored in state
    renderCtx.add.text(/* description */);
  };
});
```

This eliminates the class of bugs where a screen re‑enters and a stale Phaser
ref in `state` causes double‑render or access‑after‑destroy errors.

### 5. Router with typed params

`NavigationEvent` is a flat set of void events today. Screens that need
context on entry (crystal selection passing a crystal ID to battleground,
or returning to a specific tab in options) would benefit from typed
route params:

```typescript
type Routes = {
  title: void;
  battleground: { crystalId: string };
  crystals: void;
  options: { tab?: string };
};
```

### 6. Framework package (`framework/` or `@mana/framework`)

Pull the client-runtime patterns out of `phaser/src/` into a thin
framework package so they survive future engine changes:

```
framework/
  src/
    Screen.ts           ← Screen type
    ScreenManager.ts    ← ScreenManager
    createScreen.ts     ← Factory helper
    Router.ts           ← Typed navigation
    Event.ts            ← Re-export from core
```

This package would live between `core/` (pure logic) and `phaser/src/`
(client rendering), with Phaser-specific adapters staying in `phaser/`.

---

## Roadmap

### Phase A — Stabilize patterns ✅

- [x] `Event<T>` primitive in `core/`
- [x] `NavigationEvent` + `BattlegroundEvent` + `GameEvent` in `Events.ts`
- [x] `init()` / `create()` / `destroy()` on all screens — plus `name` export
- [x] `switchScreen()` central navigation with promise-chain mutex
- [x] Screens decoupled via events (no direct cross-screen imports)
- [x] `createScreenLifecycle()` helper for idempotent init / disposer cleanup
- [x] `screenShown` / `screenHidden` global events for service reactions

### Phase B — `createScreen()` factory with auto‑disposal (complete)

This is the highest‑value extraction: a factory that eliminates manual cleanup.

- [x] Design the `createScreen<TPhase, Events>(spec)` API surface
      → **Done** (2026-07-29, Cline): `createScreen<TPhase, Events>(spec)` in
      `phaser/src/Screens/screenTracking.ts`. Spec: `{ name, events(), create(ctx),
      phases? }`. The returned object satisfies the `ScreenModule` shape used by
      `Client.ts` and additionally exposes `go(phase)` / `currentPhase()`.
- [x] Build resource‑tracking primitives: PhaseTracker, `ctx.track(obj)`, ID registry,
      `ctx.onDestroy` disposer stack.
      → **Done** (2026-07-29, Cline).
- [x] `ctx.add()` overloads — accepts single objects or arrays with `idPrefix` for
      predicted IDs. Replaces `forEach(el => ctx.track(el))` boilerplate.
      → **Done** (2026-07-30, Cline). 6 `forEach` patterns eliminated across 3 screens.
- [x] Optional `phases` — single-view screens (e.g. CrystalSelection) can omit
      `phases` entirely instead of defining a dummy `"main"` type + no-op handler.
      → **Done** (2026-07-30, Cline).
- [x] `ctx.refresh()` — destroys phase-scoped objects and re-runs the current phase
      handler. Useful for locale changes and in-place re-renders.
      → **Done** (2026-07-30, Cline).
- [x] `screenModule()` helper — reduces per-screen export boilerplate
      (`name`/`events`/`init`/`create`/`destroy`/`go`/`currentPhase`) from ~15 lines
      to a single destructure. Also handles `onDestroy` for extra cleanup.
      → **Done** (2026-07-30, Cline). All 3 screens migrated.
- [x] Refactor TitleScreen to prove the pattern
      → **Done** (2026-07-29, Cline): `TitleScreen` migrated with four phases
      (`main`, `submenu`, `options_submenu`, `language`).
- [x] Refactor remaining non‑battleground screens: `OptionsScreen`, `CrystalSelectionScreen`
      → **Done** (2026-07-30, Cline): `OptionsScreen` migrated (3 phases: audio/graphics/game
      tabs, phased tab content auto-disposed). `CrystalSelectionScreen` migrated
      (single-view, no phases, event-driven crystal navigation).
- [x] Clean state objects: remove Phaser refs from screen state (they're in the factory now)
      → **Done** (2026-07-30, Cline): `CrystalSelectionScreen.state` object eliminated;
      Phaser refs tracked via `ctx.add()`, data accessed via `getSelection()`.
- [x] Delete old `createScreenLifecycle()` once all screens migrated
      → **Done** (2026-07-30, Cline): `screenLifecycle.ts` deleted. Zero consumers remain.
- [ ] Refactor `BattlegroundScreen` — will need to compose with the phase-handler lifecycle
      → Deferred to Phase C; Battleground uses its own handler-based phase system.

### Phase C — ScreenManager + Router (complete)

- [x] Define typed route map (`type Routes = { title: void; battleground: { crystalId: string }; ... }`)
      → **Done** (2026-07-31, Cline): `Routes` type in `phaser/src/Screens/ScreenManager.ts`.
      `battleground` carries an optional `crystalId` (resume-game navigates without a new session);
      `options` carries an optional `tab` for deep-links.
- [x] Extract `Client.ts` navigation into `createScreenManager()`:
  - Screen registry
  - Active screen tracking + nav mutex (already works, move it)
  - Fade transitions (configurable)
  - Emits `screenShown` / `screenHidden` automatically
      → **Done** (2026-07-31, Cline): `createScreenManager()` in `ScreenManager.ts`.
      `Client.ts` registers the manager via `setScreenManager()` at boot; the old
      `switchScreen`/`doSwitchScreen`/`wireNavigation` code was deleted. Fade duration/color
      are configurable via `transitions: { fadeMs, color }`, and the first-load fade-out is skipped.
- [x] `ScreenManager.go(route, params)` replaces raw `NavigationEvent.emit()`
      → **Done** (2026-07-31, Cline): all screens call `getScreenManager().go(...)`.
      `NavigationEvent` removed from `Events.ts`.
- [x] Deep-link support (e.g. navigate to a specific options tab)
      → **Done** (2026-07-31, Cline): `go("options", { tab: "graphics" })` switches the
      options screen to the requested tab after create; skips if already on that phase.

### Phase D — Framework package

- [ ] Extract `createScreen`, `ScreenManager`, `Router` into `framework/` package (or `@mana/framework`)
- [ ] Keep Phaser adapters in `phaser/src/` (the factory's `renderCtx.add.*` helpers are Phaser-specific)
- [ ] Document as the canonical way to add a screen
- [ ] Screen generator / template for `npm run new:screen <name>`

---

## Non-Goals

- **Server-side framework**: This is client-only. The server uses
  request-response and doesn't need screens or a router.
- **Generic UI toolkit**: The framework provides screen lifecycle and
  navigation, not a component library. Phaser rendering stays in
  `phaser/src/`.
- **Replacing Phaser**: The framework wraps and orchestrates Phaser; it
  doesn't replace it. An engine swap would mean rewriting the Phaser
  adapters, not the framework core.

---

## References

- [core/README.md](../core/README.md) — three-layer model and migration plan
- [AGENTS.md](../AGENTS.md) — practical guide to the three-tier event system, nav mutex, and DOM cleanup patterns
- [purity-boundary.md](purity-boundary.md) — import rules enforced by the core/client split
- The former `Env.ts` `ScreenRegistry` type — the unfinished interface that hinted at this direction.
  **Removed** (2026-07-31, Cline) once the ScreenManager (Phase C) superseded it.
