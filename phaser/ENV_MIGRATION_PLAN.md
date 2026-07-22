# Env Migration Plan

> **Status:** 🎉 **Phases 4 & 5 complete**, **Phase 3 sub-phases 3a & 3b complete** — Only sub-phase 3c (dispatch unification) deferred. All `io.xxx` calls migrated, `window.io` bridge removed, `io.ts` deleted, `@IO` alias cleaned up. Controller is now pure of UI dependencies and direct state mutation.
> **Goal:** Replace the global `window.io` singleton with an explicit `Env` record passed through the UI layer.
> **Status:** ✅ **Phase 3 (3a+3b) complete** — Controller is pure, all state mutation and event emission handled by callers. 3c (dispatch unification) deferred.

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

> **Status:** ✅ **Complete** — All three sub-phases done. `GameController.ts` deleted.

#### Sub-phase 3a — Remove UI imports from GameController ✅

- [x] Add `unitPurchaseCompleted`, `unitSoldCompleted`, `orbApplied` events to `Events.ts`
- [x] Make `Event.emit()` async-aware to support async listeners (awaits returned Promises)
- [x] `GameController.purchaseUnit`: replace `await handleShopPhase.onUnitPurchased(...)` → `await BattlegroundEvent.unitPurchaseCompleted.emit(...)`
- [x] `GameController.sellUnit`: replace `await handleShopPhase.onUnitSold(unitId)` → `await BattlegroundEvent.unitSoldCompleted.emit({ unitId })`
- [x] `GameController.applyOrb`: replace `await onOrbApplied(...)` → `await BattlegroundEvent.orbApplied.emit(...)`
- [x] Remove `import * as handleShopPhase` and `import { onOrbApplied }` from `GameController.ts`
- [x] `handleShopPhase.init()`: listen for `unitPurchaseCompleted` and `unitSoldCompleted`
- [x] `handleOrbShopPhase.init()`: listen for `orbApplied`
- [x] TypeScript compiles with 0 errors
- [x] All core tests pass (290/290)
- [x] ESLint clean (0 new issues)

**Design decision — async events:** The `Event.emit()` primitive was changed from synchronous `forEach` to async-aware. It collects Promises returned by listeners and `await Promise.all(...)` them. This preserves the ordering where UI animation must complete before `phaseFinished` fires, which triggers the next phase transition.

#### Sub-phase 3b — Controller returns state instead of mutating in-place ✅

- [x] Remove `env` import from `GameController.ts` — all deps are explicit
- [x] `dispatchAction` takes `playerId: string` explicitly (no `env.state` read)
- [x] Each function accepts explicit state params (`playerId`, `currentPhase`, `currentTeamUnits`, etc.)
- [x] All functions return result objects instead of mutating `env.state`
- [x] `requestMainMenu` / `requestNewRun` removed — callers emit events directly
- [x] All 10 callers updated to pass params, update state via `env.updateState()`, and emit events
- [x] TypeScript compiles with 0 errors
- [x] All core tests pass (290/290)
- [x] ESLint clean (0 new issues)

**Files changed (callers):**
| File | Change |
|---|---|
| `ShopPanel.ts` | `skipPhase()` → pass playerId/phase, handle state + `phaseFinished` |
| `menuButton.ts` | Removed Controller imports, emit `newRunRequested`/`mainMenuRequested` directly |
| `GameCompleteUI.ts` | Removed Controller imports, emit events directly |
| `input.ts` | `sellUnit`/`updateTeam` → pass playerId, handle state + `unitSoldCompleted` |
| `Encounter.ts` | `selectEncounter`/`skipPhase` → pass state, handle state + events |
| `EffectCardShop.ts` | `selectEncounter` → pass state, handle state + events |
| `handleOrbShopPhase.ts` | `applyOrb` → pass state, handle state + `orbApplied` + `phaseFinished` |
| `handleVictoryPhase.ts` | `completeVictory` → wrap callback with state + event handling |
| `handleCombatPhase.ts` | `completeCombatEncounter` → pass wins/losses/round, handle HUD events |
| `CharaShop.ts` | `purchaseUnit` (×2) → pass state, handle state + `unitPurchaseCompleted` |

#### Sub-phase 3c — Unify call patterns through `env.dispatch` ✅

- [x] Replace all `GameController.xxx()` calls with `env.dispatch(action)` + inline pre-state capture
- [x] Delete `GameController.ts` — all 10 exported functions removed
- [x] Remove `Controller` re-export from `io.ts`
- [x] TypeScript compiles with 0 errors
- [x] All core tests pass (290/290)
- [x] ESLint clean (0 new issues)

**Pattern:** Each caller now captures pre-state from `env.state` before dispatch, then updates state and emits events after:
```ts
const previousPhase = env.state.session.phase;
const { session, combatState } = await env.dispatch({ type: "select_encounter", encounterId: id });
env.updateState({ ...env.state, session, combatState });
BattlegroundEvent.phaseFinished.emit({ previousPhase });
```

**The `purchaseUnit` validation logic** (wasUpgrade/didAddUnit check) was inlined at both call sites in `CharaShop.ts`. This is the only non-trivial logic from GameController — it could be extracted to `core/src/` as a pure helper if needed in the future.

### Phase 4 — Migrate remaining `io.xxx` consumers to `env.*`

> **Status:** Complete — all ~200 `io.xxx` calls across ~30 files migrated. `io.ts` deleted, `@IO` alias removed.

Each file referencing `io.xxx()` was switched to one of:
- Import `{ env } from "@Env"` and use `env.scene.xxx()` / `container(env.scene)` / `borderedRoundRect(env.scene)` / etc.
- Call object methods directly (e.g., `obj.setPosition(x, y)` ← `io.SetPosition(obj, [x, y])`)
- Import `{ BattlegroundEvent } from "Events"` ← `io.screens.battleground.events`

- [x] All `io.xxx` call sites migrated
- [x] TypeScript compiles with 0 errors
- [x] All core tests pass (290/290)

#### Completed migration table

| `io.xxx()` | Replacement |
|---|---|
| `io.Container([children])` | `container(env.scene, [children])` |
| `io.Text(str, style)` | `env.scene.add.text(0, 0, str, style)` |
| `io.Title1(str)` | `env.scene.add.text(0, 0, str, constants.titleTextConfig)` |
| `io.SetPosition(obj, [x, y])` | `obj.setPosition(x, y)` |
| `io.Centralize(obj)` | `obj.setOrigin(0.5)` |
| `io.BorderedRoundRect(pos, size, r, c, a)` | `borderedRoundRect(env.scene, pos, size, r, c, a)` |
| `io.Rectangle(pos, size, c, a)` | `centeredRect(env.scene, pos, size, c, a)` |
| `io.Tween(config)` | `env.scene.tweens.add(config)` |
| `io.Shader(frag, pos, size, uniforms)` | `shader(env.scene, ...)` or `env.shader(...)` |
| `io.RectangularDropZone(n, pos, size)` | `rectangularDropZone(env.scene, n, pos, size)` |
| `io.Show/Hide/Destroy(obj)` | `obj.setVisible(true/false)` / `obj.destroy(true)` |
| `io.BringToTop(obj)` | `env.scene.children.bringToTop(obj)` |
| `io.Delay(ms)` | `animation.delay(ms)` |
| `io.OnPointerOver/Out/Up(obj, cb)` | `obj.on(Phaser.Input.Events.POINTER_OVER/OUT/UP, cb)` |
| `io.WhenDroppedOnZone(o, t, cb)` | `whenDroppedOnZone(o, t, cb)` |
| `io.screens.battleground.events.X` | `import { BattlegroundEvent }` → `BattlegroundEvent.X` |
| `io.Controller.skipPhase()` | `env.dispatch({ type: "skip" })` |
| `io.game.sound.xxx` | `env.scene.game.sound.xxx` |
| `io.game.scene.getScenes(true)` | `env.scene.game.scene.getScenes(true)` |

#### Files migrated by group

| Group | Files | Key io.xxx patterns replaced |
|---|---|---|
| **A — Title panels** | StatsPanel, CreditsPanel, LinksPanel, LanguagePanel, howToPlay, CollectionModal, optionsButton, tabbedMenu, TutorialOverlay | `io.Title1/2`, `io.SetPosition`, `io.Centralize`, `io.BorderedRoundRect`, `io.Container`, `io.BringToTop`, `io.Tween`, `io.Text` |
| **B — Battleground UI** | ForceStats, menuButton, UI, roundDisplay, winsDisplay, livesDisplay, RunStatsPanel | `io.Container`, `io.Rectangle`, `io.OnPointerOver/Out`, `io.screens.battleground.events` |
| **C — Shop/Results** | DiscardZone, ShopPanel, OrbShop, EffectCardShop, CharaShop, VictoryUI, DefeatUI, GameCompleteUI, CombatStatsTable | `io.Container`, `io.WhenDroppedOnZone`, `io.BorderedRoundRect`, `io.Show/Hide/Destroy`, `io.screens.battleground.events`, `io.Controller.skipPhase` |
| **D — Phase handlers** | Encounter, handleCombatPhase, handleShopPhase, handleOrbShopPhase | `io.screens.battleground.events`, `io.Delay`, `io.Tween`, `io.Controller.skipPhase` |
| **E — Shaders/input** | RankDisplay, BlackHole, input, CharaShop, EncounterCard | `io.Shader`, `io.WhenDroppedOnZone`, `io.Tween`, `io.SetInteractiveRect`, `io.OnPointerOver/Out/Up` |
| **F — Other** | ArenaLobbyScene, AudioManager | `io.Text`, `io.game.sound/scene` |

### Phase 5 — Remove `window.io` global and delete `io.ts` ✅

- [x] Remove `window.io = io_` from `main.ts`
- [x] Remove `declare global { var io }` from `main.ts`
- [x] Replace `_env` with `env` singleton in `io.ts` (direct import from Env.ts)
- [x] Remove `io.setEnv(env)` bridge from `Client.ts`
- [x] Remove `io.getEnv()` / `io.initPhaserIO()` / `io.MoveBelow()` (unused)
- [x] Delete `io.ts` entirely
- [x] Remove `@IO` alias from `tsconfig.json`, `webpack/config.base.cjs`, `jest.config.cjs`, `server/tsconfig.build.json`

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
