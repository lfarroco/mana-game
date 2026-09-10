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
npm run format # at root, to run prettier over the whole project (core/, phaser/, and server/)

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
- [server/AGENTS.md](server/AGENTS.md) — Node multiplayer API
- [phaser/AGENTS.md](phaser/AGENTS.md) — the Phaser client

## Verification Commands

After any change, run the checks for the package you touched (each package has
its own `package.json` — run from inside that directory):

| Package      | Tests                            | Typecheck           | Lint           |
|--------------|----------------------------------|---------------------|----------------|
| `core/`      | `npm test` (66 suites/602)       | `npm run typecheck` | —              |
| `server/`    | `npm test` (188 tests)           | `npm run typecheck` | —              |
| `phaser/`    | `npm run test:ci` (23 suites/164) | `npm run typecheck` | `npm run lint` |

Single test file: `npx jest src/path/ToFile.test.ts --runInBand` from the
package directory. Full command reference: [docs/building-and-running.md](docs/building-and-running.md).

Format check without writes: `npm run format:check` from the repo root.

## Coding Standards

Key rules:
- **Prefer functional programming**: plain objects, pure functions, immutability, higher-order functions.
- **Classes only for Phaser integration**: scenes, game objects extending Phaser classes.
- **Minimize inheritance**: no unnecessary inheritance chains.
- **Client-server boundary**: battleground screens and phase handlers dispatch actions via `env.dispatch` (wired once in `Scenes/BootScene.ts` to `GameServer.getServer().handleAction`) and the `dispatchAction`/`finishPhase` helpers in `BattlegroundScene.ts`, rather than importing `phaser/src/GameServer.ts` directly.

## Knowledge Index

### Architecture & Source Layout

Pure, framework-agnostic game logic is being extracted into a top-level `core/` package (aliased as `@game/*`); see [core/README.md](core/README.md) for the migration plan. Most logic has migrated to `core/` — see its [index.ts](core/src/index.ts) for the full directory layout.

- `core/` (top-level package, aliased as `@game/*`)
  - Purpose: Pure, framework-agnostic game logic — see [core/src/index.ts](core/src/index.ts) for the full barrel export
  - Key modules: `math/` (Random, Geometry, Constants), `board/` (BoardLogic), `Combat/` (simulation, runner, logger, poison, regen, timeout, status systems), `Entities/` (Card, Unit, Force), `session/` (management, transitions, option/enemy generation), `TriggerSystem/` (triggers & effects), `Actions/` (recruitment, orb upgrades), `Orbs/` (definitions, constants), `data/` (BaseCollection, effect builders), `PhaseSystem/` (phase config), `types/` (domain type definitions), `Functional.ts` (primitives), `Event.ts`
- `phaser/src/Scenes/`
  - Purpose: Phaser scene infrastructure — one scene per screen (replaced `@mana/framework`)
  - Key files: `BootScene.ts` (asset load + `env` + `__debug`, starts `title`), `ScreenScene.ts` (base class), `AppRouter.ts` (`go(route, params)`, hang-proof fades), `routes.ts`, `PhaseController.ts` (framework-free phase runner for multi-phase screens). See [docs/scene-migration.md](docs/scene-migration.md)
- `phaser/src/Screens/Battleground/`
  - Purpose: Phaser scene orchestration — main battleground screen, phase handlers, combat playback
  - Key files: `BattlegroundScene.ts`, `Components/`, `Phases/`, `playerBoardSync.ts`
- `phaser/src/`
  - Purpose: Remaining Phaser-specific code (screens, UI components, effects, assets)

- `server/` (top-level package, Node 22 + express 5, imports core via `@game/*`)
  - Purpose: Authoritative Node game server API for multiplayer sessions — replaces the retired Supabase backend (Phase 1 session API implemented 2026-08-11)
  - Key files: `src/app.ts`, `src/http/routes/` (`sessions.ts`, `players.ts`), `src/services/` (`sessionService.ts`, `playerService.ts`), `src/persistence/` (`repositories.ts` + in-memory `memory.ts`), `src/dto.ts`; phased plan: [docs/game-server.md](docs/game-server.md)

### Documentation Index

Detailed docs live in `docs/`. Each covers a specific system:

- [building-and-running.md](docs/building-and-running.md): Setup, all npm scripts, platform requirements
- [battle-system.md](docs/battle-system.md): Phase management, combat flow, board logic
- [combat-architecture.md](docs/combat-architecture.md): Client-server combat separation, playback system
- [game-server.md](docs/game-server.md): Phased plan for the Node multiplayer backend — all phases implemented (session API, Steam-only auth, matchmaking & rating, client integration, SQLite persistence)
- [multiplayer-lobby.md](docs/multiplayer-lobby.md): Multiplayer lobby — `GET /players/me` profile endpoint, `run_completions` career/season victory stats, and the lobby hub screen
- [auth.md](docs/auth.md): Server auth design — Steam-only login (Steam tickets → `AuthenticateUserTicket` → your own bearer tokens), guest accounts in a future phase, provider abstraction
- [itchio-auth.md](docs/itchio-auth.md): itch.io auth for the web build — OAuth implicit flow, implementation plan + resume guide (planned 2026-08-20)
- [trigger-system.md](docs/trigger-system.md): Action-Reaction model, effects, targeting
- [character-unit-system.md](docs/character-unit-system.md): Unit/Card types, Chara rendering system
- [unit-balance.md](docs/unit-balance.md): Power budget, cost formulas, trigger frequencies
- [card-design-philosophy.md](docs/card-design-philosophy.md): Tier design (bronze/silver/gold roles), the upgrade curve, card authoring checklist
- [card-system-risks-and-roadmap.md](docs/card-system-risks-and-roadmap.md): Risk analysis and sequenced improvement plan for the card system — silver pool expansion, gold feasibility audits, disruption mechanics, AP model refinements
- [wacky-content-plan.md](docs/wacky-content-plan.md): Reviewed, implementation-ready plan for "fun and wacky" content — new units, effect types, encounters, and edits (tiered tasks A0–D2)
- [purity-boundary.md](docs/purity-boundary.md): Pure logic boundary, replay-critical import rules
- [storage-system.md](docs/storage-system.md): Provider pattern, Steam Cloud, localStorage
- [audio-system.md](docs/audio-system.md): Music, SFX, cooldowns, user preferences
- [awaken.md](docs/awaken.md): The Awaken mechanic — bronze→gold promotions route into a special phase where the player picks one of three reactions to permanently add to the unit
- [ui-system.md](docs/ui-system.md): UI components, event handling, layout management
- [encounter-system.md](docs/encounter-system.md): Encounter generation, shop flow, phase structure — how the 15 encounter types filter, price, and sequence card/orb acquisition between combats
- [effect-system.md](docs/effect-system.md): Visual effect pipeline, particles, and combat integration
- [options-system.md](docs/options-system.md): Options data model, persistence, UI bindings
- [localization.md](docs/localization.md): i18n, adding languages, fallback logic
- [achievement-system.md](docs/achievement-system.md): Steam achievements, victory tiers
- [code-quality-cleanup.md](docs/code-quality-cleanup.md): Verified code-quality findings for `phaser/` and the prioritized cleanup plan (incl. multiplayer-backend reimplementation scope)
- [core-code-quality.md](docs/core-code-quality.md): Verified code-quality findings for `core/` and the prioritized improvement plan (incl. the confirmed single-player win-recording bug)
- [framework-formalization.md](docs/framework-formalization.md): **Historical** — the long-term vision that produced the `@mana/framework` package (Screen, ScreenManager, createScreen, Router). The package was decommissioned in favour of raw Phaser scenes; kept for its Screen state purity rules and history.
- [framework-hardening.md](docs/framework-hardening.md): **Historical** — evaluation findings and the hardening plan for the deleted `@mana/framework` (nav-mutex failure semantics, async teardown support, lifecycle serialization).
- [scene-migration.md](docs/scene-migration.md): **Complete** — decommissioning `@mana/framework` in favour of raw Phaser scenes (`Scenes/ScreenScene.ts`, `Scenes/AppRouter.ts`, `Scenes/PhaseController.ts`). Every screen, including battleground, is migrated; the framework and legacy host are deleted. Migration checklist + architecture.
- [combat-playback-performance.md](docs/combat-playback-performance.md): Further performance optimizations for the combat playback system beyond the initial July 2026 round
- [combat-system-improvements.md](docs/combat-system-improvements.md): Remaining improvements to the effect/reaction engine, threshold reactions, and combat test infrastructure in `core/`
- [project-architecture.md](docs/project-architecture.md): High-level architecture breakdown of the `core/`, `phaser/`, and `server/` packages

### Key Architectural Patterns

1. **Three-tier Event System** — Events are categorized by lifespan and scope:

   | Tier                          | File                                                       | Wired when                              | Payload rule                              | Example                                     |
   |-------------------------------|------------------------------------------------------------|-----------------------------------------|-------------------------------------------|---------------------------------------------|
   | **Screen-scoped**             | Each scene owns theirs (`TitleScene`, `CrystalSelectionScene`, …) | Per scene `buildScreen()`          | May carry Phaser refs                     | `newGameButtonClicked`, `crystalChanged`    |
   | **Screen-lifecycle-crossing** | `phaser/src/Events.ts` — `BattlegroundEvent`               | Per battleground entry (`buildScreen`/`onScreenShutdown`) | Plain data only             | `phaseFinished`, `combatPlaybackFinished`   |
   | **Global game events**        | `phaser/src/Events.ts` — `GameEvent`                       | Once at boot (never torn down)          | **Plain data only — no Phaser refs ever** | `screenShown`, `screenHidden`, `runStarted` |

   - Screen-scoped events: created in `buildScreen()` and their listeners are disposed in `onScreenShutdown()` — Phaser destroys the game objects, not the module-level subscriptions.
   - `BattlegroundEvent`: wired per screen entry in `BattlegroundScene.buildScreen()`, disposed in `onScreenShutdown()`. Carries domain data only.
   - `GameEvent` (added 2026-07-28): wired once in `Scenes/BootScene.ts` `wireGameEvents()`. Listeners must never capture Phaser game objects. Services (Tooltip, AudioManager, StatsStore) subscribe here instead of being imported by screens.

2. **Screen lifecycle (raw Phaser scenes)** — every screen is a real `Phaser.Scene`. `Scenes/AppRouter.ts` replaces the ScreenManager; `Scenes/BootScene.ts` (first scene in `main.ts`) loads assets once, creates `env`, initialises stores and starts `title`. `Scenes/ScreenScene.ts` is the base class: it repoints `env.scene` at the active screen, emits `screenShown`/`screenHidden`, and exposes a `ready` promise. **Phaser owns teardown** — `scene.start(key)` shuts the outgoing scene down and destroys its game objects, tweens and timers, so nothing dangles or duplicates across a restart (the reason the framework existed). Caveat: a scene's `events` emitter is only cleared on scene *destroy*, so `scene.events.on(...)` subscriptions a screen adds must be removed in `onScreenShutdown()` (capture the emitter at registration — `env.scene` is repointed on navigation).
   - Screens navigate with `go(route, params)` from `@Scenes/AppRouter`. Every route IS its own Phaser scene key. A scene's probe/event name may differ from its key (`crystals` → `crystal_selection`) via `ScreenScene`'s optional second constructor argument.
   - **New screens** extend `ScreenScene` (`npm run new:screen -- <Name>` scaffolds one): build UI in `buildScreen()`, reset module-level state (flags, DOM, `@game` subscriptions) in `onScreenShutdown()`, add the route to `Scenes/routes.ts` and the class to the `main.ts` scene list. Full checklist: [docs/scene-migration.md](docs/scene-migration.md).
   - Sub-menus are scene-local state, not phases: `TitleScene.go(phase)` destroys the current menu's elements and builds the next. `go`/`currentPhase` stay public for the `__debug`/e2e probes.
   - With multiple scenes, `Phaser.Scenes.Events.SHUTDOWN` **does** fire — it is the hook for cleaning up module-level state Phaser can't know about.

3. **Navigation (`AppRouter.go`)** — replaces the promise-chain nav mutex:
   - `go("title"); go("crystals"); go("title")` → A runs, B is skipped (coalesced), C runs. Same-screen requests are dropped immediately.
   - Every route is `scene.start(route, params)` after a fade; there is no legacy host or sub-manager.
   - **Hang-proof**: the outgoing fade resolves on `FADE_OUT_COMPLETE` *or* a bounded timeout, and `go()` waits (bounded) for the incoming screen's `ready`. A stuck animation or a scene restarting can never strand navigation — the failure players reported.
   - Typed routes with per-route params via `RouteParams` in `Scenes/routes.ts` (e.g. `go("options", { tab: "graphics" })`).

4. **Combat Playback**: Combat is simulated server-side → produces logs → client plays back animations. Entry: `Phases/Combat/handleCombatPhase.ts` (`CombatPhase` → `beginCombatPlayback`) → `Phases/Combat/CombatPlaybackController.ts`.

5. **Server Adapter**: Single-player and multiplayer both go through the `ServerAdapter` interface (`phaser/src/GameServer.ts`). `getServer()` returns `LocalServer` or `RemoteServer` based on the session's `session_type`.

6. **Phase Config**: `core/src/PhaseSystem/PhaseConfig.ts` defines the per-round phase rotation (`ROUND_PHASES`, `advanceToNextPhase`, `getPhaseForTurn`). The battleground main loop runs in `phaser/src/Screens/Battleground/BattlegroundScene.ts` (see item 8).

7. **Trigger System**: Units have `effects` (actions on cooldown) and `reactions` (responses to other units' effects). Defined in `TriggerSystem/TriggerSystem.ts`.

8. **Battleground phase orchestration**: `phaser/src/Screens/Battleground/BattlegroundScene.ts` is a `ScreenScene` that declares every phase as a `PhaseEntry` (`{ handler, transition? }`) and hands them to `createPhaseController` (`Scenes/PhaseController.ts`) — the framework-free replacement for `createScreen({ phases })`. Each handler receives a `BGContext` and returns/tracks its destroyables; the controller destroys them on the next phase switch, serialising `exit → destroy → handler → enter`. Phases create a dedicated Phaser Container for their UI so teardown is a single `container.destroy(true)` call. `transitionToCurrentPhase` (wired to `BattlegroundEvent.phaseFinished` in `buildScreen()`) reads the phase from session state, calls `syncPlayerBoardUnits()` to reconcile the player board, then calls `controller.go(phase)`. Phase-scoped events (combat pause/replay/continue, victory continue — 2026-08-03) are subscribed via `ctx.listen()` inside the phase handler, so they're auto-disposed when the phase ends. `dispatchAction`/`finishPhase`/`beginPhaseTransition`/`restorePhaseExit` stay module-level (dozens of components have no scene reference) and delegate to the controller created by the active scene, which `onScreenShutdown()` clears. The `combat` phase is split into a playback phase plus client-only results phases (`combat_victory`/`combat_defeat`, 2026-08-07): `combat` plays the battle back and on `playbackFinished` calls `go(combatState.wonCombat ? "combat_victory" : "combat_defeat")`; the results phases render the victory/defeat overlay + combat-stats table and handle continue (tears down combat then dispatches `end_combat`) and replay (`go("combat")`) via `ctx.listen`. These sub-phases are client-only view states — not present in `session.phase` — so resuming a saved game always lands at combat playback. Phase enter/exit transitions (`phaser/src/Screens/Battleground/phaseTransitions.ts`) respect a `skipPhaseTransition` GameObject data key — elements flagged with it (e.g. an orb dropped on a unit that is dissolving in place at the drop target) stay put while the rest of the phase slides.

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
   The screen's teardown must call this; in a scene, do it in `onScreenShutdown()` (see `TitleScene`, `CrystalSelectionScene`). Phaser owns the game objects, not the module-level flag or DOM node.

## Issues

> Update this section with bugs that you find that are not related with your current task.

> **Reported (2026-09-07, player report): some players never transition screens
> at all** — 100% reproducible for them ("the game will never move to the next
> screen unless I use the main-menu skip between every screen"). The migration
> to raw Phaser scenes is the response; the new `AppRouter` makes transitions
> hang-proof (bounded fade + bounded ready wait) and `env.fade*` is bounded too.
> **Resolved (2026-09-10):** every screen — including battleground, the last
> one — is a raw `ScreenScene`, and `@mana/framework` plus the legacy host are
> deleted. See [docs/scene-migration.md](docs/scene-migration.md).
>
> Still worth a release-candidate smoke pass: the whole run loop (encounter →
> shop → combat → results → next round) after the migration has unit coverage
> but no e2e pass, since the Playwright suite is broken.




## Task Queue

> Pick a task, mark it `[x]` with your agent name and date when done, then **remove the entry from this list once completed** — the queue holds only open work. Add new tasks as discovered.

> **Multiplayer lobby landed (2026-08-20)** — `GET /api/v1/players/me` profile
> endpoint + `run_completions` persistence (memory + sqlite), the
> `MultiplayerLobbyScreen` hub, and the title-screen entry rewired through it.
> Full spec + file map: [docs/multiplayer-lobby.md](docs/multiplayer-lobby.md).

> **Android multiplayer + Google sign-in landed (2026-09-02)** — server
> `google` provider (`POST /api/v1/auth/google`, ID-token verification via
> tokeninfo with an `aud` check), the `multiplayer_login` login-screen hub
> (Google / itch.io / Log out / Back; Steam auto-login bypasses it), the
> Android OAuth transport (system browser + game-server relay page
> `GET /oauth/callback` + `com.manabattle.app://` deep link via
> `@capacitor/app`/`@capacitor/browser`), Google sign-in on **web too** (OAuth
> popup through the same relay, since 2026-09-02), logout + lobby-401 re-auth,
> and the build/deploy env plumbing (`MANA_GOOGLE_ENABLED`/
> `MANA_GOOGLE_CLIENT_ID`, webpack define + guardrail, `make android-build`
> prod defaults). **Live smoke tests (Android D2 + web Google popup) are
> pending** — they need the human-side one-time setup (Google Cloud OAuth
> client + redirect-URI registrations) listed in
> [docs/android-multiplayer.md](docs/android-multiplayer.md).

> **All previously queued work is landed.** The last deferred item — the
> **Manual Steam smoke test** (plan.md task 14) — passed 2026-08-20: a real
> Steam ticket was authenticated end-to-end (`Electron → server → Steam Web
> API`) and the local SQLite DB (`server/data/mana.db`) holds the resulting
> Steam player + bearer token (`provider=steam`, Steam64 `STEAM64_REDACTED`).
> The queue is now empty; see [plan.md](plan.md),
> [docs/auth.md](docs/auth.md), and [docs/game-server.md](docs/game-server.md).

> **Player-bugfix round (2026-08-31):** three reported bugs fixed with
> regression tests — (1) phase transitions could stall forever (a tween/timer
> killed by the ScreenManager teardown never fired its callback, freezing the
> phase chain while the session kept advancing) — `animation.tween`/`delay`
> are now hang-proof and `dispatchAction` bounds the exit-animation wait;
> (2) permanent power ("when the crystal is hit, gain permanent power")
> reverted after every fight because combat results were never written back —
> `finalPlayerUnits` now aliases the simulated player units and
> `transitionAfterCombat` writes the rested post-combat team into the session;
> (3) the `on_crystal_hit` reaction shield landed 200ms after the triggering
> hit — reactions now fire before the damage resolves and reaction shields
> apply instantly, so the shield absorbs the hit that procs it.

> **Player-bugfix (2026-09-02):** Infinite (Endless) mode showed the run-complete
> victory screen after every won wave. `transitionAfterCombat` compared the
> absolute win count to `WINS_TO_WIN_GAME`, but Endless continues the same
> session with wins parked above the threshold — so every `end_combat` re-entered
> the `victory` phase. The run-complete victory now fires exactly once per run:
> on the won combat that first crosses `WINS_TO_WIN_GAME` (wins only ever grow,
> so crossing happens once). Regression tests in `SessionTransitions.test.ts`
> cover the 9→10 crossing, the Endless entry via the `victory` action, won waves
> in rounds 11-15 (upgrade_core tail) and 16+ (roll into the next round's
> encounters), and losses past the threshold ending only at `LOSSES_TO_GAME_OVER`.

> The **Purify deferred** item (C1 `tutorialSlides.ts` render-layer rewrite +
> B4 log-dispatch switch) landed 2026-08-19 — see the Phase E/F notes in
> [purify.md](purify.md).

> **Landed (2026-08-19):** every Fun & Wacky content task (Tier A–D — A0–A8
> units/edits, A9–A12 encounters, A15 shops, B1/C1/C2/D1/D2 engines; A13/A14 were
> superseded by CUB-B) and every Core Unit Onboarding task (CUB-A1–A3 through
> CUB-G1/G2/G3). Full specs, commit refs, and landing notes live in
> [docs/wacky-content-plan.md](docs/wacky-content-plan.md) and
> [docs/core-unit-onboarding.md](docs/core-unit-onboarding.md).

> **Removed (2026-08-23):** the favor-token mechanic — E1 skip-to-silver
> guarantee (`favorTokens`) and the Lucky Pig encounter (A12, favor ×3) — was
> rolled back. `skip` no longer banks tokens, the HUD favor counter is gone, and
> `lucky_pig` was removed from the encounter pool. See
> [docs/new-encounter-types.md](docs/new-encounter-types.md) E1.

