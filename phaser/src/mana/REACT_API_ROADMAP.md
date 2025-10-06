# Mana React-Style API Roadmap

**Goal:** Turn Mana into an approachable "React for web games" layer on top of Phaser that favors a declarative, composable, and ergonomic API for gameplay UI and in-game systems.

---

## Current Baseline

- `createComponent`/`render` expose a low-level render loop that expects callers to manage state and diffing manually.
- Elements are immutable data objects rendered via `setData`, but there's no concept of component-local state or props like React function components.
- Interaction helpers (`withClickable`, `withHoverable`) return raw ManaMsgs and require manual message plumbing.
- Lifecycle hooks exist (`registerMountHook`, `registerUnmountHook`), yet there's no friendly surface for composing side-effects or cleanup per component instance.
- Validation/dev-mode warnings, factory registries, and tween actions are already in place—great primitives we can wrap in a higher-level DX.

---

## High-Priority Opportunities

### 1. Function Components + Hooks Layer
- **Problem:** Authors must wire `createComponentState`, `setData`, and message dispatch manually, which is far from the React mental model.
- **Proposal:** Introduce `ManaFC<Props>` signature (function components) that return `ElementTree` and receive `{ props, context, hooks }`. Provide core hooks (`useState`, `useReducer`, `useMemo`, `useScene`, `useTween`). Store hook state in `state.elementState` keyed by component instance.
- **Impact:** Unlocks idiomatic composition, state encapsulation, and makes the API feel familiar to React developers.
- **Touchpoints:** `state.ts` (hook state storage), `renderer.ts` (hook lifecycle), `core.ts` (component instantiation), `lifecycle.ts` (cleanup).

### 2. JSX/TSX Support with Babel/TS Transform
- **Problem:** Authoring nested `Element` objects is verbose; container trees become noisy objects.
- **Proposal:** Ship a compile-time transform (Babel plugin or TypeScript custom JSX factory) that lowers `<Container id="hud">...</Container>` into the current element shape. Provide `mana/jsx-runtime` with type-safe intrinsics and auto-completion.
- **Impact:** Dramatically reduces boilerplate, aligns with React ergonomics, makes API approachable for UI engineers.
- **Touchpoints:** New package for JSX runtime, updates to `types.ts` for intrinsic element typing, documentation in `README.md`.

### 3. Declarative Effects (`useEffect`-like)
- **Problem:** Lifecycle hooks are registry-based and type-oriented, not instance-oriented. Side-effects require manual mount/unmount wiring.
- **Proposal:** Add hook helpers such as `useEffect(() => {...}, deps)` and `useInterval(...)` that tie into component lifecycle, automatically cleaning up via `callUnmountHooks`.
- **Impact:** Lowers barrier for handling tweens, timers, and scene events without leaking resources.
- **Touchpoints:** Hook runtime (new module), `lifecycle.ts` integration, `actions.ts` for automatic cleanup.

### 4. Event & Message Ergonomics
- **Problem:** `onClick` handlers must return `readonly Msg[]`; devs rarely need such low-level control.
- **Proposal:** Provide higher-level events that accept plain callbacks (`onClick={() => doSomething()}`) and internally wrap/dispatch messages. Offer `useDispatch()` hook for advanced cases. Support composed gestures (click, drag, long-press) via reusable hooks.
- **Impact:** Simplifies interaction code, reduces accidental misuse of ManaMsg plumbing.
- **Touchpoints:** `properties.ts`, `actions.ts`, new hook utilities, HOCs refactor.

### 5. Scene-Level App Shell (`<ManaApp />`)
- **Problem:** Consumers must manage the render loop (`setData`) imperatively.
- **Proposal:** Provide `<ManaApp scene={scene}>` wrapper (or `createManaApp(scene, Component)`) that subscribes to Phaser `UPDATE`, batches state updates, and renders automatically when hooks signal changes.
- **Impact:** Delivers the "single render call" experience analogous to ReactDOM.render, removing boilerplate from every scene.
- **Touchpoints:** `core.ts`, `state.ts`, scene integration utilities in `initGame.ts`.

### 6. Typed Props & Children Contracts
- **Problem:** `Element` generics only enforce message types; props/children remain untyped and ad-hoc.
- **Proposal:** Generate typed component props from factories (`createButton(props: ButtonProps)`), encourage `ManaFC<Props>` definitions, and add validation to ensure required props exist. Consider `PropTypes`-style dev warnings using existing validation system.
- **Impact:** Safer authoring, clearer API docs, easier code completion.
- **Touchpoints:** `types.ts`, `validation.ts`, component library definitions.

### 7. Built-In Component Library “Mana UI”
- **Problem:** Only `manaButton` exists; devs rebuild primitives (panels, lists, HUD widgets).
- **Proposal:** Ship a curated set of accessible UI primitives (Button, Panel, ProgressBar, Slider, ListView) implemented with new hooks and JSX runtime. Include them in `components/` with Storybook-like demos.
- **Impact:** Demonstrates best practices, accelerates adoption, showcases React-style patterns.
- **Touchpoints:** `components/`, `examples/`, docs.

---

## Medium-Priority Enhancements

- **Context & Providers:** Implement `createContext` / `useContext` to share data (player stats, localization) without prop drilling. Backed by scene-level state map.
- **Concurrent Update Scheduling:** Mirror React’s concurrent mode by deferring expensive re-renders using Phaser's time events; integrate with `checkPerformance` to throttle.
- **Data Fetching Helpers:** Provide `useAssets()` for texture loading with suspense-like fallback states.
- **Improved HOC/Hook Surface:** Refactor `hocs/index.ts` into composable hooks (`useHover`, `usePressable`) plus wrapper components to remove nested HOC clutter.
- **Test Utilities:** Publish `@mana/test` helpers that mock Phaser scenes, allow hook testing, and snapshot rendered element trees.
- **CLI Scaffolding:** Add `mana create button` command that generates boilerplate, documentation, and tests to keep patterns consistent.

---

## Long-Term / Exploratory Ideas

- **DevTools Overlay:** Scene inspector that visualizes component tree, hook state, and dispatched messages in real time (draw overlays inside Phaser or via Electron devtools).
- **Time-Travel Debugging:** Persist `ComponentState` snapshots and allow rewinding message streams for deterministic replay.
- **Cross-Platform Renderer Abstraction:** Define a renderer interface so Mana element trees could target PIXI or WebGL directly, broadening the ecosystem beyond Phaser.
- **Hot Module Replacement for Components:** Integrate with Vite/Electron build to hot-swap component modules while preserving hook state (React Fast Refresh inspiration).
- **Design Toolkit Integration:** Export component metadata to tools like Figma or Rive to sync art pipelines with declarative layout definitions.

---

## Supporting Work & Prerequisites

- **State Internals Audit:** Ensure `elementState` and `eventHandlersAttached` can store per-instance hook metadata without leaks; add automated cleanup tests in `core.test.ts`.
- **Message Type Simplification:** Consider wrapping `ManaMsg` union inside namespaced modules so end-users can import granular helpers (e.g., `import { tween } from 'mana/animation'`).
- **Documentation Refresh:** Update `README.md`, add a "React mental model" tutorial, and record short screen captures showing JSX + hooks workflow once implemented.
- **Sample Game Refactor:** Rewrite one existing example scene using the proposed hooks & JSX stack to validate ergonomics and identify missing primitives.

---

## Measuring Success

- Onboarding survey: new devs can ship an interactive UI panel in ≤30 minutes without touching low-level Phaser APIs.
- Boilerplate reduction: representative HUD example drops from ~150 LOC of element objects to ≤80 LOC of JSX + hooks.
- Stability: automated tests confirm zero leaked tweens/handlers after repeated mount/unmount cycles.
- Adoption: internal teams migrate existing HUDs to Mana function components without regressions.

> These improvements focus on smoothing the developer journey so writing Mana components feels as natural as building React components—while still embracing Phaser's strengths for game rendering.
