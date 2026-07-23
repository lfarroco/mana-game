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

| Primitive | File | Description |
|---|---|---|
| `Event<T>` | `core/src/Event.ts` | Typed, self-contained pub/sub. `listen(…) → disposer`, `emit(payload)`, `clear()`. No EventEmitter, no string keys. |
| `Option<T>` | `core/src/Functional.ts` | No-null return types for pure functions. |
| `Result<T, E>` | `core/src/Functional.ts` | No-throw error handling for pure functions. |

### Client runtime (`phaser/src/`)

| Concept | File(s) | Description |
|---|---|---|
| `Env` singleton | `phaser/src/Env.ts` | Application shell wrapping Phaser: `scene`, `state`, `dispatch`, `time`, `audio`, `fadeOut`/`fadeIn`, Phaser helpers. Imported as `env` — never null. |
| Global events | `phaser/src/Events.ts` | `NavigationEvent` (toTitle, toBattleground, toCrystals, toOptions) and `BattlegroundEvent` (phaseFinished, combat events, HUD deltas). Cross-cutting only. |
| Screen lifecycle | All `Screens/*` | `init()` → `create()` → `destroy()`. Idempotent init, re-entrant create. |
| Screen-local events | Per-screen modules | Each screen defines its own typed events (e.g. `CrystalSelectionEvents`, `OptionsScreenEvents`) scoped to that screen. |
| `switchScreen()` | `Client.ts` | Centralized navigation: calls `activeScreen.destroy()` → fades out → clears → `screen.init()` → `screen.create()` → fades in. |
| Phase handlers | `Battleground/Phases/` | Each phase exports `registerListeners(): (() => void)[]` wired once by `wireBattlegroundEvents()`. |

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
emit NavigationEvent ──────────► Client.ts switchScreen() (cross-screen transition)
```

---

## What a Formal Framework Would Add

Today the patterns exist by convention. A framework would make them
**enforceable by tooling.**

### 1. `Screen<TState, TEvents>` type

A formal contract residing in a shared location (likely `framework/` or
a `Screen.ts` in `core/`), not an ad-hoc type in `Client.ts`:

```typescript
type ScreenModule<
  TState extends Record<string, unknown>,
  TEvents extends Record<string, Event<any>>
> = {
  init: () => { state: TState; events: TEvents };
  create: (state: TState, events: TEvents) => void | Promise<void>;
  destroy: () => void;
};
```

### 2. `ScreenManager`

Extracted from `Client.ts` into a standalone module. Handles:

- Screen registry (map of screen IDs → ScreenModules)
- Active screen tracking
- Enter/exit transitions (fade, cleanup, init)
- Typed navigation (params per route)

```typescript
const manager = createScreenManager({
  title: TitleScreen,
  battleground: BattlegroundScreen,
  crystals: CrystalSelectionScreen,
  options: OptionsScreen,
});

// Typed navigation
manager.go("crystals");
manager.go("battleground", { crystalId: "mana_crystal" });
```

The existing `ScreenRegistry` type and `noopScreens` fallback in `Env.ts`
suggest this was anticipated but never completed.

### 3. `createScreen()` factory

Eliminates the ~15-line boilerplate every screen duplicates today:

```typescript
// Today (every screen)
let disposers: (() => void)[] = [];
let initialized = false;
export function init() { if (initialized) return; initialized = true; ... }
export function destroy() { disposers.forEach(d => d()); ... }

// With factory
export const { init, create, destroy } = createScreen(({ on, dispose }) => {
  on(events.playClicked, handlePlay);
  on(NavigationEvent.toTitle, handleBack);
  // ...
});
```

### 4. State / effects / components separation

Screens should enforce a clean split:

| Layer | Concern | Depends on |
|---|---|---|
| **State** | Pure data (currentIndex, crystals) | Nothing |
| **Events** | Typed event definitions | `core/Event` |
| **Effects** | Listeners that react to events, mutate state, call dispatch | State, Events, Env |
| **Components** | Phaser rendering, button creation | Env, Events (emit only) |

Today `CrystalSelectionScreen.state` mixes pure data with Phaser refs
(`crystalSprite: Phaser.GameObjects.Image`). A framework would enforce
that state objects contain no rendering refs.

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

### Phase A — Stabilize patterns (current state ✅)

- [x] `Event<T>` primitive in `core/`
- [x] `NavigationEvent` + `BattlegroundEvent` in `Events.ts`
- [x] `init()` / `create()` / `destroy()` on all screens
- [x] `switchScreen()` central navigation
- [x] Screens decoupled via events (no direct cross-screen imports)

### Phase B — Extract types (next)

- [ ] Define `ScreenModule` type in a shared location
- [ ] Create `ScreenManager` class (pulled from `Client.ts`)
- [ ] Add `createScreen()` factory to eliminate init/destroy boilerplate
- [ ] Clean screen state objects (no Phaser refs in state)

### Phase C — Router + params

- [ ] Typed route definitions with params
- [ ] `ScreenManager.go()` replaces raw `NavigationEvent.emit()`
- [ ] Deep-link support (e.g., navigate to a specific options tab)

### Phase D — Framework package

- [ ] Extract `Screen`, `ScreenManager`, `createScreen`, `Router` into
  `framework/` package (or `@mana/framework`)
- [ ] Keep Phaser adapters in `phaser/src/`
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

- [Event-Driven Architecture](event-driven-architecture.md) — the event
  system that underpins the framework
- [core/README.md](../core/README.md) — three-layer model and migration plan
- [purity-boundary.md](purity-boundary.md) — import rules enforced by the
  core/client split
- The `Env.ts` `ScreenRegistry` type — the unfinished interface that
  hints at this direction
