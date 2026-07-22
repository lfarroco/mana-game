# Env Migration Plan

> **Status:** Phase 4 complete ✅ — All `io.xxx` call sites migrated to `env` / direct Phaser API. Phase 5 almost complete — `window.io` removed. Only `io.ts` file deletion and alias cleanup remain.
> **Goal:** Replace the global `window.io` singleton with an explicit `Env` record passed through the UI layer.
> **Phase 4 migration:** ~30% done (~30 files / ~200 `io.xxx` calls remaining).

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

### Phase 4 — Migrate remaining `io.xxx` consumers to `env.*`

> **Status:** ~30 files remain, ~200 `io.xxx` call sites left.
> `window.io` bridge still exists in `main.ts` for backward compat — removed when this phase completes.

Each file referencing `io.xxx()` must switch to one of:
- Import `{ env } from "@Env"` and use `env.scene.xxx()` / `env.container()` / `env.borderedRoundRect()` / etc.
- Call object methods directly (e.g., `obj.setPosition(x, y)` ← `io.SetPosition(obj, [x, y])`)

#### Conversion reference

| `io.xxx()` | Replacement |
|---|---|
| `io.Container([children])` | `env.container([children])` |
| `io.Text(str, style)` | `env.scene.add.text(0, 0, str, style)` |
| `io.Title1(str)` | `env.scene.add.text(0, 0, str, constants.titleTextConfig)` |
| `io.Title2(str)` | `env.scene.add.text(0, 0, str, { ...constants.titleTextConfig, fontSize: "22px" })` |
| `io.Label(str)` | `env.scene.add.text(0, 0, str, constants.defaultTextConfig)` |
| `io.SetPosition(obj, [x, y])` | `obj.setPosition(x, y)` |
| `io.Centralize(obj)` | `obj.setOrigin(0.5)` |
| `io.SetAlpha(obj, n)` | `obj.setAlpha(n)` |
| `io.BorderedRoundRect(pos, size, r, c, a)` | `env.borderedRoundRect(pos, size, r, c, a)` |
| `io.Rectangle(pos, size, c, a, stroke)` | `env.centeredRect(pos, size, c, a, stroke)` |
| `io.Circle([x,y], r, c, a)` | inline: `scene.add.graphics({x,y})` + `fillCircle(0,0,r)` |
| `io.Tween(config)` | `env.scene.tweens.add(config)` |
| `io.RectangularDropZone(n, pos, size)` | `env.rectangularDropZone(n, pos, size)` |
| `io.Shader(frag, pos, size, uniforms)` | `env.shader(frag, pos, size, uniforms)` |
| `io.FadeOut(duration, color)` | `env.fadeOut(duration, color)` |
| `io.FadeIn(duration)` | `env.fadeIn(duration)` |
| `io.Show(obj)` | `obj.setVisible(true)` |
| `io.Hide(obj)` | `obj.setVisible(false)` |
| `io.Destroy(obj)` | `obj.destroy(true)` |
| `io.BringToTop(obj)` | `env.scene.children.bringToTop(obj)` |
| `io.Delay(ms)` | `env.time.delay(ms)` |
| `io.SetInteractiveRect([w,h])` (chain) | `(t) => { t.setInteractive(new Phaser.Geom.Rectangle(0,0,w,h), Phaser.Geom.Rectangle.Contains); return t; }` |
| `io.OnPointerDown/Up/Over/Out(obj, cb)` | `obj.on(Phaser.Input.Events.POINTER_DOWN/UP/OVER/OUT, cb)` |
| `io.OnceDestroyed(obj, cb)` | `obj.once("destroy", cb)` |
| `io.DisableInteractive(obj)` | `obj.disableInteractive()` |
| `io.WhenDroppedOnZone(o, t, cb)` | `import { whenDroppedOnZone } from "./phaser-helpers"` |
| `io.screens.title.create()` | `import * as TitleScreen from ".../TitleScreen"` → `TitleScreen.create()` |
| `io.screens.battleground.events.X.emit()` | `import { BattlegroundEvent } from ".../Events"` → `BattlegroundEvent.X.emit()` |
| `io.createEvent<T>(name)` | `make<T>()` from Events.ts inline pattern |
| `io.Controller.xxx` | `import * as GameController from ".../GameController"` |
| `io.i18n(key)` | `import { t } from "@i18n/i18n"` → `t(key)` |
| `io.game.sound.xxx` | `env.scene.sound.xxx` |
| `io.clean()` | inline: `scene.children.each(c => c.destroy()); scene.children.removeAll(); scene.tweens.killAll(); scene.time.removeAllEvents()` |

#### Remaining files by group

**Group A — Title screen panels:**
- `StatsPanel.ts` — `io.Title1/2`, `io.SetPosition`, `io.Centralize`, `io.BorderedRoundRect`, `io.Container`, `io.BringToTop`
- `CreditsPanel.ts`, `LinksPanel.ts`, `LanguagePanel.ts` — same pattern
- `howToPlay.ts`, `CollectionModal.ts`, `tabbedMenu.ts` — `io.Title1`, `io.Tween`, `io.Container`
- `TutorialOverlay.ts` — many `io.Container`, `io.Text`, `io.Title1` calls
- `optionsButton.ts` — `io.Container`, `io.BringToTop`

**Group B — Battleground UI:**
- `ForceStats.ts` — `io.Container`, `io.Rectangle`
- `menuButton.ts` — heavy: all wrapper types, `io.screens.battleground.events`
- `UI.ts`, `roundDisplay.ts`, `winsDisplay.ts`, `livesDisplay.ts`, `RunStatsPanel.ts` — various wrappers

**Group C — Battleground shop / results:**
- `DiscardZone.ts` — `io.Container`, `io.BorderedRoundRect`, `io.RectangularDropZone`, `io.Show/Hide`, `io.Destroy`, `io.BringToTop`
- `ShopPanel.ts`, `OrbShop.ts`, `EffectCardShop.ts`, `CharaShop.ts` — `io.Container`, `io.WhenDroppedOnZone`
- `VictoryUI.ts`, `DefeatUI.ts`, `GameCompleteUI.ts`, `CombatStatsTable.ts` — results panel wrappers

**Group D — Phase handlers:**
- `Encounter.ts` — `io.Container`, `io.Delay`, `io.Tween`, `io.Controller`, `io.screens.battleground.events`
- `handleCombatPhase.ts`, `handleShopPhase.ts`, `handleOrbShopPhase.ts` — events via `io.screens.battleground`

**Group E — Shaders and input:**
- `RankDisplay.ts`, `BlackHole.ts` — `io.Shader`
- `input.ts`, `CharaShop.ts`, `EncounterCard.ts` — `io.WhenDroppedOnZone`

**Group F — Other:**
- `ArenaLobby/ArenaLobbyScene.ts` — `io.Text` and others
- `Systems/AudioManager.ts` — `io.game.sound.xxx` (works via Proxy, migrate eventually)

#### Recommended migration order

1. **Small/simple files** — Title panels, no sub-dependencies (Group A)
2. **Battleground UI** — Core gameplay screens (Group B)
3. **Phase handlers** — Use `BattlegroundEvent` import from `Events.ts` (Group D)
4. **Shaders & input** — Use `env.shader()`, `import { whenDroppedOnZone } from "path/to/phaser-helpers"` (Group E)
5. **Shop/Results** — Complex panels (Group C)
6. **ArenaLobby + AudioManager** — Last, verify backward compat (Group F)

### Phase 5 — Remove `window.io` global and delete `io.ts`

- [x] Remove `window.io = io_` from `main.ts`
- [x] Remove `declare global { var io }` from `main.ts`
- [x] Replace `_env` with `env` singleton in `io.ts` (direct import from Env.ts)
- [x] Remove `io.setEnv(env)` bridge from `Client.ts`
- [x] Remove `io.getEnv()` / `io.initPhaserIO()` / `io.MoveBelow()` (unused)
- [x] Add `env.container()`, `env.borderedRoundRect()`, `env.centeredRect()`, `env.rectangularDropZone()`, `env.shader()`, `env.fadeOut()`, `env.fadeIn()` helpers
- [x] **Migrate all remaining `io.xxx` call sites** (Phase 4) — **100% done** ✅
  - Migrated ~200 `io.xxx` calls across ~30 files
  - All replaced with `env.scene.*` direct calls, `container()/borderedRoundRect()/centeredRect()` helpers from Env, `BattlegroundEvent` imports, and direct Phaser API calls
- [x] Remove `window.io` bridge from `main.ts` (the `import * as io_` and `window.io = io_`)
- [ ] Delete `io.ts` entirely
- [ ] Remove `@IO` alias from `tsconfig.json`, `webpack`, `jest.config.cjs`

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
