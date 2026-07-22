# Env Migration Plan

> **Status:** POC phase — `Env` type defined and factory created (`src/Env.ts`).
> **Goal:** Replace the global `window.io` singleton with an explicit `Env` record passed through the UI layer.
> **Motivation:** Enforce functional programming principles (explicit dependencies, no globals, pure functions), improve testability, and untangle the Controller ↔ UI circular dependency.

## Current Architecture (what we're fixing)

```
window.io (global mutable singleton)
├── Phaser wrappers (Container, Text, Tween, FadeOut, …)
├── io.screens (title, battleground, options, …)
├── io.emitter / io.createEvent (string-based event bus)
├── io.Controller (re-exported GameController)
├── io.i18n, io.clean(), io.initPhaserIO()
└── io.game / io.scene (mutable Phaser refs)

Problems:
- Global mutable singleton — anti-pattern in FP
- Kitchen sink — too many unrelated concerns in one object
- Controller imports UI code (circular: UI → Controller → UI)
- ClientState mutated in-place everywhere
- Two patterns for calling Controller (direct import vs io.Controller)
- Hard to test — can't easily mock/replace the global
```

## Target Architecture

```
createEnv(scene, initialClientState) → Env (explicit param, no globals)

Env {
  state: ClientState              // immutable snapshot, updated via updateState()
  phaser: {                       // all Phaser wrappers live here
    scene: Phaser.Scene
    game: Phaser.Game
    container(), text(), tween(), fadeOut(), …
  }
  events: EventBus                // typed event emitter
  screens: ScreenRegistry         // screen navigation
  dispatch: (action) => Promise   // action dispatch (replaces Controller mutating state)
  updateState: (next) => void     // single point of state mutation
}

Benefits:
- Explicit dependencies — every function declares what it needs
- Testable — mock/replace Env in tests
- No globals — window.io eliminated
- Pure Controller — no UI imports, returns effects instead
- Single state mutation point — easier to trace data flow
```

## Migration Phases

### Phase 1 — Define Env type & factory ✅ (POC)

- [x] Create `phaser/src/Env.ts` with `Env` type and `createEnv()` factory
- [x] Include Phaser context (scene, game) and event bus
- [x] Add all Phaser wrappers to `Env.phaser` (Container, Text, Tween, FadeOut, FadeIn, Shader, etc.)
- [x] Add `io.setEnv()`/`io.getEnv()` bridge for backward compatibility
- [x] Wire `createEnv()` into `Client.ts` — env is created at startup
- [x] Thread `env` through `BattlegroundScreen.ts` (POC — `createEventChannel`, `transitionFromBattleground`, `init`, `create`)

### Phase 2 — Migrate Phaser wrappers into `Env.phaser`

- [x] **Dropped entirely** — replaced by direct `env.scene` access
- [x] Created `phaser-helpers.ts` for genuinely useful composables (container with children, centered bordered rect, drop zones by name, shader with tuple uniforms)
- [x] Removed all 40+ wrapper functions from Env — Phaser's native API is the API
- [x] Added `env.time` (promise-based delay, delta, scale)
- [x] Added `env.audio` (absorbs AudioManager — sfx, music, stop, volume refresh)
- [x] Updated `BattlegroundScreen.ts` to use `env.scene.cameras.main.fade` directly

### Phase 3 — Refactor Controller to be pure

- [ ] Remove UI imports from `GameController.ts` (`handleShopPhase`, `onOrbApplied`)
- [ ] Controller functions return `{ newState, effects }` instead of mutating in-place
- [ ] Phase loop in `BattlegroundScreen` does event emission and state updates
- [ ] Unify call patterns: only one way to call Controller actions (via `env.dispatch`)

### Phase 4 — Thread `env` through UI modules

- [x] `BattlegroundScreen` receives `env` and passes it to phase handlers (events use `createEventChannel`, transitions use `env.phaser.*`)
- [ ] `Encounter.ts` receives `env` instead of importing Controller directly
- [ ] `CharaShop.ts` receives `env` instead of importing Controller directly
- [ ] `EffectCardShop.ts` receives `env` instead of importing Controller directly
- [ ] `ShopPanel.ts` receives `env` instead of using `io.Controller`
- [ ] `handleOrbShopPhase.ts` receives `env`
- [ ] `handleShopPhase.ts` receives `env`
- [ ] `input.ts` (Chara) receives `env`
- [ ] `Components.ts`, `Board.ts` receive `env` where needed
- [ ] All screens (Title, Options, CrystalSelection) receive `env`

### Phase 5 — Remove `window.io` global

- [x] Remove `window.io = io_` from `main.ts`
- [x] Remove `declare global { var io }` from `main.ts`
- [x] Replace `_env` with `env` singleton in `io.ts` (direct import from Env.ts, no bridge needed)
- [x] Remove `io.setEnv(env)` bridge from `Client.ts` (env is now imported directly)
- [x] Remove `io.getEnv()` / `io.initPhaserIO()` / `io.MoveBelow()` (unused)
- [x] Add `env.container()`, `env.borderedRoundRect()`, `env.centeredRect()`, `env.rectangularDropZone()`, `env.shader()`, `env.fadeOut()`, `env.fadeIn()` helpers
- [ ] Delete `io.ts` — blocked by remaining ~200 `io.xxx` call sites
- [ ] All imports of `io.ts` replaced with `env` parameter — **in progress (~30% done)**

## Design Decisions

### Module-scoped singleton (not a global)
`env` is exported as `export let env: Env` from `Env.ts`. It's set once at startup by `createEnv()`.
Consumers import it explicitly: `import { env } from "./Env"`. Unlike `window.io`, there's no implicit
global — every file that uses `env` declares its dependency via the import. But unlike a threaded
parameter, there's no null-guard boilerplate because env is guaranteed to exist when scene code runs.

### Events: in-house, no strings, no EventEmitter
```typescript
// src/Events.ts — central typed catalog
const make = <T>(): Event<T> => {
  const listeners = new Set<(payload: T) => void>();
  return {
    listen: (cb) => { listeners.add(cb); },
    emit: (payload) => { listeners.forEach((cb) => cb(payload)); },
  };
};

export const BattlegroundEvent = {
  phaseFinished: make<{ previousPhase: PhaseType }>(),      // zero args
  combatPauseRequested: make<void>(),
  winsChanged: make<{ wins: number; delta: number }>(),
  // ...
};
```
Each event owns its listener set. No EventEmitter, no string keys, no `createEventChannel`
on env. Import what you need: `import { BattlegroundEvent } from "../Events"`.
The property name IS the event identity.

### Direct Phaser scene, no wrapper layer
`env.scene` gives full raw Phaser API access. No 40+ wrapper functions to learn.
A few genuinely useful composables (`container()`, `borderedRoundRect()`, `whenDroppedOnZone()`)
live in `phaser-helpers.ts` and are imported explicitly where needed.

### `env.time` and `env.audio` as value-add namespaces
Phaser is callback-based for timing and has scattered audio APIs.
`env.time.delay(ms)` returns a Promise. `env.audio.sfx(key)` / `env.audio.music(key)`
absorb the separate AudioManager singleton.

### Why not just improve `io.ts` incrementally?

The fundamental issue is the global singleton pattern. FP principles require explicit dependencies.
We could refactor `io.ts` to export a factory instead of a singleton, but that only fixes half
the problem. The `Env` record approach also solves:
- Controller purity (no UI imports)
- Consistent single point of state mutation
- Testability

### Why pass `env` explicitly instead of using React-style Context?

TypeScript doesn't have a built-in context/dependency injection mechanism for vanilla function
chains. The alternatives are:
1. **Explicit parameter threading** (what we're doing) — verbose but transparent
2. **Reader monad** — requires a library like fp-ts, adds complexity for the team
3. **Global singleton** (current approach) — simple but untestable

Explicit threading is the pragmatic choice for a game codebase that values simplicity.

### What about "prop drilling" fatigue?

For deeply nested components that all need `env`, we can use partial application:

```typescript
// Instead of each function receiving env:
const withEnv = (env: Env) => ({
  createBoard: () => Board.create(env),
  renderShop: (options) => Shop.render(env, options),
});
```

This creates a "bound" module of functions that carry `env` implicitly, reducing boilerplate.
