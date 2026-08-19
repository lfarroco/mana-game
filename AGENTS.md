# AI Agent Guide — Mana Battle

This file is the entry point for AI agents working on the Mana Battle codebase. 

## Agent Workflow

- **Read this file** to orient yourself.
- **Read the relevant docs** from the Knowledge Index.
- **Check the coding standards** before writing code.
- **Implement the change**, including tests where appropriate.


## Project Overview

Mana Battle is a PVE trigger-based autobattler on a 3x3 board, built with Phaser 3 + TypeScript, packaged with Electron for desktop and Capacitor for Android. See the [README](README.md) for the public-facing overview. Multiplayer sessions are served by the Node game server in `server/` (Steam auth, session API, matchmaking & rating, and SQLite persistence implemented 2026-08-14) — see [docs/game-server.md](docs/game-server.md).

## Quick Start

```bash
npm run format # at root, to run prettier over the whole project (core/, phaser/, server/, and framework/)

cd phaser
npm install
npm run dev        # http://localhost:8080
npm run test       # jest unit tests
npm run test:e2e   # playwright e2e tests, currently broken
npm run lint       # eslint
```

## Package Guides

Each package ships its own `AGENTS.md` with layout maps, conventions, and
gotchas — read the one for the package you're working in **before** editing:

- [core/AGENTS.md](core/AGENTS.md) — pure game logic (`@game/*`)
- [framework/AGENTS.md](framework/AGENTS.md) — screen/nav framework (`@mana/framework`)
- [server/AGENTS.md](server/AGENTS.md) — Node multiplayer API
- [phaser/AGENTS.md](phaser/AGENTS.md) — the Phaser client

## Verification Commands

After any change, run the checks for the package you touched (each package has
its own `package.json` — run from inside that directory):

| Package      | Tests                           | Typecheck           | Lint           |
|--------------|---------------------------------|---------------------|----------------|
| `core/`      | `npm test` (66 suites/602)      | `npm run typecheck` | —              |
| `framework/` | `npm test` (7 suites/56)        | `npm run typecheck` | —              |
| `server/`    | `npm test` (167 tests)          | `npm run typecheck` | —              |
| `phaser/`    | `npm run test:ci` (7 suites/38) | `npm run typecheck` | `npm run lint` |

Single test file: `npx jest src/path/ToFile.test.ts --runInBand` from the
package directory. Full command reference: [docs/building-and-running.md](docs/building-and-running.md).

## Coding Standards

Key rules:
- **Prefer functional programming**: plain objects, pure functions, immutability, higher-order functions.
- **Classes only for Phaser integration**: scenes, game objects extending Phaser classes.
- **Minimize inheritance**: no unnecessary inheritance chains.
- **Client-server boundary**: battleground screens and phase handlers dispatch actions via `env.dispatch` (wired once in `Client.ts` to `GameServer.getServer().handleAction`) and the `dispatchAction`/`finishPhase` helpers in `BattlegroundScreen.ts`, rather than importing `phaser/src/GameServer.ts` directly.

## Knowledge Index

### Architecture & Source Layout

Pure, framework-agnostic game logic is being extracted into a top-level `core/` package (aliased as `@game/*`); see [core/README.md](core/README.md) for the migration plan. Most logic has migrated to `core/` — see its [index.ts](core/src/index.ts) for the full directory layout.

- `core/` (top-level package, aliased as `@game/*`)
  - Purpose: Pure, framework-agnostic game logic — see [core/src/index.ts](core/src/index.ts) for the full barrel export
  - Key modules: `math/` (Random, Geometry, Constants), `board/` (BoardLogic), `Combat/` (simulation, runner, logger, poison, regen, timeout, status systems), `Entities/` (Card, Unit, Force), `session/` (management, transitions, option/enemy generation), `TriggerSystem/` (triggers & effects), `Actions/` (recruitment, orb upgrades), `Orbs/` (definitions, constants), `data/` (BaseCollection, effect builders), `PhaseSystem/` (phase config), `types/` (domain type definitions), `Functional.ts` (primitives), `Event.ts`
- `framework/` (top-level package, aliased as `@mana/framework`)
  - Purpose: Engine-agnostic client framework — screen lifecycle, resource tracking, typed navigation (Phase D of [docs/framework-formalization.md](docs/framework-formalization.md))
  - Key modules: `Screen.ts` (`ScreenModule` contract), `createScreen.ts` (factory + `screenModule()`), `ScreenManager.ts` (nav core: registry, nav mutex, typed routes, deep-links + engine hooks), `Router.ts`, `Event.ts` (re-export of the core event primitive). Own jest + tsconfig; run `npm test` / `npm run typecheck` inside `framework/`
- `phaser/src/Screens/Battleground/`
  - Purpose: Phaser scene orchestration — main battleground screen, phase handlers, combat playback
  - Key files: `BattlegroundScreen.ts`, `Components/`, `Phases/`, `playerBoardSync.ts`
- `phaser/src/`
  - Purpose: Remaining Phaser-specific code (screens, UI components, effects, assets)

- `server/` (top-level package, Node 22 + express 5, imports core via `@game/*`)
  - Purpose: Authoritative Node game server API for multiplayer sessions — replaces the retired Supabase backend (Phase 1 session API implemented 2026-08-11)
  - Key files: `src/app.ts`, `src/http/routes/sessions.ts`, `src/services/sessionService.ts`, `src/persistence/` (`repositories.ts` + in-memory `memory.ts`), `src/dto.ts`; phased plan: [docs/game-server.md](docs/game-server.md)

### Documentation Index

Detailed docs live in `docs/`. Each covers a specific system:

- [building-and-running.md](docs/building-and-running.md): Setup, all npm scripts, platform requirements
- [battle-system.md](docs/battle-system.md): Phase management, combat flow, board logic
- [combat-architecture.md](docs/combat-architecture.md): Client-server combat separation, playback system
- [game-server.md](docs/game-server.md): Phased plan for the Node multiplayer backend — all phases implemented (session API, Steam-only auth, matchmaking & rating, client integration, SQLite persistence)
- [auth.md](docs/auth.md): Server auth design — Steam-only login (Steam tickets → `AuthenticateUserTicket` → your own bearer tokens), guest accounts in a future phase, provider abstraction
- [trigger-system.md](docs/trigger-system.md): Action-Reaction model, effects, targeting
- [character-unit-system.md](docs/character-unit-system.md): Unit/Card types, Chara rendering system
- [unit-balance.md](docs/unit-balance.md): Power budget, cost formulas, trigger frequencies
- [card-design-philosophy.md](docs/card-design-philosophy.md): Tier design (bronze/silver/gold roles), the upgrade curve, card authoring checklist
- [card-system-risks-and-roadmap.md](docs/card-system-risks-and-roadmap.md): Risk analysis and sequenced improvement plan for the card system — silver pool expansion, gold feasibility audits, disruption mechanics, AP model refinements
- [wacky-content-plan.md](docs/wacky-content-plan.md): Reviewed, implementation-ready plan for "fun and wacky" content — new units, effect types, encounters, and edits (tiered tasks A0–D2)
- [purity-boundary.md](docs/purity-boundary.md): Pure logic boundary, replay-critical import rules
- [storage-system.md](docs/storage-system.md): Provider pattern, Steam Cloud, localStorage
- [audio-system.md](docs/audio-system.md): Music, SFX, cooldowns, user preferences
- [ui-system.md](docs/ui-system.md): UI components, event handling, layout management
- [encounter-system.md](docs/encounter-system.md): Encounter generation, shop flow, phase structure — how the 15 encounter types filter, price, and sequence card/orb acquisition between combats
- [effect-system.md](docs/effect-system.md): Visual effect pipeline, particles, and combat integration
- [options-system.md](docs/options-system.md): Options data model, persistence, UI bindings
- [localization.md](docs/localization.md): i18n, adding languages, fallback logic
- [achievement-system.md](docs/achievement-system.md): Steam achievements, victory tiers
- [code-quality-cleanup.md](docs/code-quality-cleanup.md): Verified code-quality findings for `phaser/` and the prioritized cleanup plan (incl. multiplayer-backend reimplementation scope)
- [core-code-quality.md](docs/core-code-quality.md): Verified code-quality findings for `core/` and the prioritized improvement plan (incl. the confirmed single-player win-recording bug)
- [framework-formalization.md](docs/framework-formalization.md): Long-term vision for extracting Screen, ScreenManager, createScreen, and Router into a framework package (`@mana/framework`). Phases A–D roadmap. Screen state purity rules.
- [framework-hardening.md](docs/framework-hardening.md): Verified evaluation findings for `@mana/framework` and the prioritized hardening plan (nav-mutex failure semantics, async teardown support, lifecycle serialization).
- [combat-playback-performance.md](docs/combat-playback-performance.md): Further performance optimizations for the combat playback system beyond the initial July 2026 round
- [combat-system-improvements.md](docs/combat-system-improvements.md): Remaining improvements to the effect/reaction engine, threshold reactions, and combat test infrastructure in `core/`
- [project-architecture.md](docs/project-architecture.md): High-level architecture breakdown of the `core/`, `framework/`, `phaser/`, and `server/` packages

### Key Architectural Patterns

1. **Three-tier Event System** — Events are categorized by lifespan and scope:

   | Tier                          | File                                                     | Wired when                              | Payload rule                              | Example                                     |
   |-------------------------------|----------------------------------------------------------|-----------------------------------------|-------------------------------------------|---------------------------------------------|
   | **Screen-scoped**             | Each screen module (e.g. `TitleScreen` exports `events`) | Per `init()`                            | May carry Phaser refs                     | `newGameButtonClicked`, `crystalChanged`    |
   | **Screen-lifecycle-crossing** | `phaser/src/Events.ts` — `BattlegroundEvent`             | Per battleground entry (create/destroy) | Plain data only                           | `phaseFinished`, `combatPlaybackFinished`   |
   | **Global game events**        | `phaser/src/Events.ts` — `GameEvent`                     | Once at boot (never torn down)          | **Plain data only — no Phaser refs ever** | `screenShown`, `screenHidden`, `runStarted` |

   - Screen-scoped events: created in `init()`, wrapped by `createScreen()` (via the `screenModule()` helper) for idempotent init + automatic cleanup.
   - `BattlegroundEvent`: wired per screen entry in `BattlegroundScreen.create()`, disposed in `BattlegroundScreen.destroy()`. Carries domain data only.
   - `GameEvent` (added 2026-07-28): wired once in `Client.ts` `wireGameEvents()`. Listeners must never capture Phaser game objects. Services (Tooltip, AudioManager, StatsStore) subscribe here instead of being imported by screens.

2. **Screen lifecycle** — Every screen is a plain module exporting `{ name, init?, create, destroy? }` matching the `ScreenModule` type in `@mana/framework`. Navigation is centralized via the **ScreenManager** (`phaser/src/Screens/ScreenManager.ts`, added 2026-07-31, Phase C of framework-formalization; since Phase D (2026-08-01) it is a thin Phaser adapter over `@mana/framework`'s nav core, injecting fades/input/scene-cleanup/`GameEvent` emission via hooks):
   - Screens call `getScreenManager().go(route, params)` instead of emitting navigation events. `NavigationEvent` was removed from `Events.ts`.
   - `screenHidden` (GameEvent) → `destroy()` → input disable → fadeOut → `children.removeAll(true)` → `tweens.killAll()` → `time.removeAllEvents()` → cursor reset → `init()` → `create()` → `activeScreen = screen` → `screenShown` (GameEvent) → input enable → fadeIn.
   - All calls are **serialised** by a promise-chain mutex (added 2026-07-28). If multiple navigation events queue while one is in flight, only the latest target runs. Coalesces redundant requests.
   - **New screens should use `createScreen()`** from `@mana/framework` (`framework/src/createScreen.ts`; added 2026-07-29 as `Screens/screenTracking.ts`, extracted to the framework package 2026-08-01). Scaffold with `npm run new:screen -- <Name>` in `phaser/`, then register the route in `Screens/ScreenManager.ts` (`Routes`) and the screen in `Client.ts`. The spec's `events()` factory replaces manual event wiring, `ctx.track(obj, { id })` auto-tracks destroyables in a persistent layer or phase scope (also accepts arrays via `ctx.track(objs)` with optional `idPrefix`), `phases` declare mutually exclusive sub-states whose tracked elements are auto-destroyed on transition — or omit `phases` entirely for single-view screens. `ctx.listen(event, cb)` (added 2026-08-03) subscribes to an event for the **current scope's lifetime**: inside a phase handler the subscription is disposed on the next phase switch / `ctx.refresh()`; in the persistent `create` layer it survives transitions and dies on screen destroy — this gives phases their own scoped listeners without a per-phase event catalog. `ctx.refresh()` destroys and re-runs the current phase handler (useful for locale changes). `ctx.findById` / `findTrackedById` recover elements by ID. The `screenModule()` helper reduces per-screen export boilerplate to a single destructure line. Components with infinite tweens must self-clean via `Phaser.GameObjects.Events.DESTROY`.

3. **Navigation mutex** — `ScreenManager` uses a promise-chain pattern (`navChain`, `pendingNavTarget`):
   - `go("title"); go("crystals"); go("title")` → A runs, B is skipped (coalesced), C runs.
   - Same-screen requests are dropped immediately.
   - Prevents interleaved fade/create/destroy sequences from rapid clicks or async emits.
   - Typed routes with per-route params (e.g. `go("options", { tab: "graphics" })` deep-links to a tab).

4. **Combat Playback**: Combat is simulated server-side → produces logs → client plays back animations. Entry: `Phases/Combat/handleCombatPhase.ts` (`CombatPhase` → `beginCombatPlayback`) → `Phases/Combat/CombatPlaybackController.ts`.

5. **Server Adapter**: Single-player and multiplayer both go through the `ServerAdapter` interface (`phaser/src/GameServer.ts`). `getServer()` returns `LocalServer` or `RemoteServer` based on the session's `session_type`.

6. **Phase Config**: `core/src/PhaseSystem/PhaseConfig.ts` defines the per-round phase rotation (`ROUND_PHASES`, `advanceToNextPhase`, `getPhaseForTurn`). The battleground main loop runs in `phaser/src/Screens/Battleground/BattlegroundScreen.ts` (see item 8).

7. **Trigger System**: Units have `effects` (actions on cooldown) and `reactions` (responses to other units' effects). Defined in `TriggerSystem/TriggerSystem.ts`.

8. **Battleground phase orchestration**: `phaser/src/Screens/Battleground/BattlegroundScreen.ts` declares every phase directly in `createScreen({ phases })` — each handler is a `(ctx) => Destroyable(s)` function whose returned elements the framework tracks and auto-destroys on phase switch or screen destroy (the former `runPhaseHandler` + `consumed`-flag adapter was removed as phases migrated, completed 2026-08-01). Phases create a dedicated Phaser Container for their UI so teardown is a single `container.destroy(true)` call. `transitionToCurrentPhase` (wired to `BattlegroundEvent.phaseFinished`, kicked off in `create()`) reads the phase from session state, calls `syncPlayerBoardUnits()` to reconcile the player board, tears down the previous phase's tracked elements, then calls the framework `go(phase)`. Phase-scoped events (combat pause/replay/continue, victory continue — 2026-08-03) are subscribed via `ctx.listen()` inside the phase handler, so they're auto-disposed when the phase ends; previously these were module-level `combatListeners` wired at screen level, which stayed active for the whole screen lifetime and failed to re-subscribe on a second battleground entry. The `combat` phase is split into a playback phase plus client-only results phases (`combat_victory`/`combat_defeat`, 2026-08-07): `combat` plays the battle back and on `playbackFinished` calls `go(combatState.wonCombat ? "combat_victory" : "combat_defeat")`; the results phases render the victory/defeat overlay + combat-stats table and handle continue (tears down combat then dispatches `end_combat`) and replay (`go("combat")`) via `ctx.listen`. These sub-phases are client-only view states — not present in `session.phase` — so resuming a saved game always lands at combat playback.

9. **DOM cleanup pattern** — For any DOM elements created by screens (e.g. the virtual keyboard in crystal selection), track them via module-level refs and export a `destroy()` function:
   ```ts
   let activeContainer: HTMLElement | null = null;
   let activeTimeoutId: ReturnType<typeof setTimeout> | null = null;
   export function destroy(): void {
       if (activeTimeoutId) { clearTimeout(activeTimeoutId); activeTimeoutId = null; }
       if (activeContainer && document.body.contains(activeContainer)) {
           document.body.removeChild(activeContainer);
       }
       activeContainer = null;
   }
   ```
   The screen's `destroy()` must call this. `create()` should call `destroy()` first for idempotency. Never rely on `Phaser.Scenes.Events.SHUTDOWN` — it never fires in the single-scene setup (added 2026-07-28).

## Issues

> Update this section as you find bugs.



## Task Queue

> Pick a task, mark it `[x]` with your agent name and date when done, then **remove the entry from this list once completed** — the queue holds only open work. Add new tasks as discovered.

### Deferred follow-ups

- [ ] **Manual Steam smoke test** (plan.md task 14): requires a real Steam publisher Web API key (`MANA_STEAM_WEB_API_KEY`) + a Steam Electron build.
- [ ] **Purify deferred**: port `tutorialSlides.ts` out of `phaser/` (Phaser-rendering factories — needs a render-layer rewrite; see [purify.md](purify.md) Phase F) and the B4 log-dispatch switch.

### Fun & wacky content — see [docs/wacky-content-plan.md](docs/wacky-content-plan.md)

> Discrete, claimable tasks for new units / effect types / encounters / edits.
> Pick one, mark `[x]` with your agent name and date when done, then remove the
> entry. Full specs, files, and acceptance criteria are in the doc.

- [ ] **A9** — encounter: Oracle's Riddle (random bronze)
- [ ] **A10** — encounter: Chaos Altar (random orb)
- [ ] **A11** — encounter: Roulette Wheel (life gamble)
- [ ] **A12** — encounter: Lucky Pig (favor ×3; needs favor tokens)
- [ ] **A15** — edit: effect shops allow silvers (round ≥ 4)
- [ ] **B1** — effect: `when` predicates on reactions
- [ ] **C1** — effect: `repeat`/retrigger
- [ ] **C2** — effect: `on_crystal_hit` (thorns)
- [ ] **D1** — effect: `silence`
- [ ] **D2** — effect: `dispel`

### Core unit onboarding — see [docs/core-unit-onboarding.md](docs/core-unit-onboarding.md)

> Simplify cores at start + theme-scoped upgrade-orb events. Full spec, baseline
> table, orb catalog, and acceptance criteria are in the doc.

> Note: CUB-B1/B2/B3 landed (2026-08-19) and superseded the old A13/A14 entries
> (upgrade_core Mystery Box / add_reaction_core random option), which were
> removed. The upgrade phases were also unreachable before CUB-B — the combat
> step-accounting fix (SessionTransitions.ts) made them reachable.

- [ ] **CUB-C1** — core AP band + `coreUpgrades.balance.test.ts`
- [ ] **CUB-D1** — retune `generateEnemyTeam.ts` round scaling
- [ ] **CUB-E1** — crystal-selection + upgrade-phase UI render themed orbs
- [ ] **CUB-E2** — i18n keys for orbs/themes
- [ ] **CUB-F1** — unit tests for themed option generation
- [ ] **CUB-F2** — full verification (core + phaser)
- [ ] **CUB-G1** — new cores from the doc's §9 ideas

