# AGENTS Archive

Completed tasks moved out of [AGENTS.md](AGENTS.md). Newest entries last.

---

Date: 2026-08-12

- [x] Client: when a unit reacts to some effect, its sprite now fades in from a
  white silhouette. Exported the existing beam-summon fade (`fadeInFromWhite` in
  `phaser/src/Components/Chara/Chara.ts` — `setTintFill(0xffffff)` + alpha 0→1
  tween → `clearTint()`) and wired it into the combat `reaction` log via a new
  `handleReaction` handler in
  `phaser/src/Screens/Battleground/Phases/Combat/logHandlers/reactionHandlers.ts`
  (the `reaction` case was previously a no-op; dispatch wired in
  `logHandlers/index.ts`). Added a unit test for the handler (2 tests, green)
  and updated `docs/effect-system.md`. Validated with jest (7 phaser suites /
  32 tests + 32 core suites / 424 tests pass) and eslint (clean on changed
  files). Note: `npm run typecheck` reports errors only from stale untracked
  old-structure dirs (`phaser/src/Client/`, `phaser/src/Systems/`), not from
  tracked code. (Cline, 2026-08-12)

Date: 2026-08-11

- [x] Reduced the energy slot glow and flashing on the battleground board: softened the shader pulse in `phaser/src/Shaders/EnergySlotShader.ts` (ring modulation narrowed from `0.7 + 0.3 * pulse` to `0.8 + 0.12 * pulse`, lowering peak brightness and halving the flash swing) and dimmed the base `intensity` in `phaser/src/Components/EnergySlot/EnergySlot.ts` (default 1.0→0.75, player 1.0→0.75, enemy 0.8→0.6, neutral 1.2→0.9). Validated with eslint (clean on changed files), unit tests (identical pass/fail baseline vs stashed state), and tsc (no errors in changed files). (Copilot, 2026-08-11)

Date: 2026-05-12

Extracted the client-runtime patterns into a standalone framework package,
completing the roadmap in [docs/framework-formalization.md](docs/framework-formalization.md).

**What was done:**

- **`framework/` package** (`@mana/framework`, started by a previous agent,
  finished here): `Screen.ts` (`ScreenModule` contract), `createScreen.ts`
  (`createScreen()` + `screenModule()` — the former `Screens/screenTracking.ts`),
  `ScreenManager.ts` (engine-agnostic nav core: registry, active-screen
  tracking, nav mutex, typed routes, deep-links; engine work injected via
  `beforeTransition`/`afterTransition` hooks), `Router.ts` (typed `go()`),
  `Event.ts` (re-export of `@mana/core/Event`). Fixed 3 typecheck errors in
  the ported tests (`mod.destroy?.()` optional-call sites + a `jest.fn`
  typing). 28 unit tests green, own jest + tsconfig, zero engine imports.
- **`screenModule()` return type**: made `init`/`create`/`destroy` required on
  the wrapper (they're always defined) so call sites like
  `TitleScreen.init()` typecheck against the destructured exports.
- **Wired `@mana/framework` into phaser**: tsconfig paths
  (`@mana/framework`, `@mana/framework/*`, `@mana/core/*`), webpack aliases in
  `webpack/config.base.cjs`, jest moduleNameMapper in `jest.config.cjs`.
- **`phaser/src/Screens/ScreenManager.ts` rewritten as a Phaser adapter
  shell**: keeps the game-specific `Routes` map and the
  `setScreenManager`/`getScreenManager`/`resetScreenManager` singleton, and
  delegates to the framework's `createScreenManager()` with hooks doing the
  Phaser work (`GameEvent.screenHidden/Shown`, outgoing `destroy()`, input
  disable/enable, `env.fadeOut/fadeIn` (skipped on first load), scene
  `removeAll`/`killAll`/`removeAllEvents`, default-cursor reset). Existing
  `ScreenManager.test.ts` passes unchanged (9 tests).
- **Deleted `Screens/screenTracking.ts` + its test** (the test was already
  ported to `framework/src/createScreen.test.ts`); all 10 import sites across
  Title/Options/CrystalSelection/Battleground screens now import from
  `@mana/framework`.
- **`BattlegroundScreen` migration is the repo owner's in-flight work** —
  left as found (WIP: imports now from `@mana/framework`; still has the
  `PhaseHandler_` rename, `create_`/`destroy_` leftovers, and pending
  lifecycle wiring, so phaser typecheck will fail on it until finished).
  Note: their WIP rename of `PhaseHandler` → `PhaseHandler_` breaks the 7
  phase modules that import `PhaseHandler`; when finishing, either restore
  the `PhaseHandler` name or update the phase modules.
- **Screen generator**: `npm run new:screen -- <Name>` in `phaser/`
  (`scripts/new-screen.ts`, run via tsx) scaffolds
  `src/Screens/<Name>/<Name>Screen.ts` from the canonical template and prints
  the route/registration checklist. Verified: generated output passes
  typecheck + lint; refuses to overwrite existing screens.
- **Docs**: framework-formalization.md Phase D marked complete (+ status
  section, primitive table, Phase B cross-reference); AGENTS.md knowledge
  index gained the `framework/` entry, patterns #2/#8 updated.

**Verification:** framework typecheck + 28 tests, phaser typecheck, phaser
jest (9 ScreenManager tests), phaser lint — all green.

---

## BattlegroundScreen `createScreen()` migration (2026-08-01, Cline)

Finished the repo owner's WIP migration of `BattlegroundScreen` to
`@mana/framework`'s `createScreen()`, resolving the open note above. Plan and
design details: [docs/battleground-screen-migration.md](docs/battleground-screen-migration.md).

**What was done:**

- Restored the `PhaseHandler` type name (the WIP `PhaseHandler_` rename broke
  7 phase modules — typecheck is green again).
- `BGPhase` widened to all 9 `Models.PhaseType` values; the spec's `phases`
  map now delegates every phase to its existing `PhaseHandler`
  (encounter/pre_combat share `EncounterHandler`).
- Added the adapter bridging the handler-based loop into the framework
  lifecycle: `runPhaseHandler` wraps each handler's async `TeardownFn` in a
  tracked `Destroyable` (fires on screen destruction via the tracker), while
  `transitionToCurrentPhase` — wired to `BattlegroundEvent.phaseFinished` and
  kicked off in `create()` — syncs the player board, awaits the previous
  teardown, then calls `go(phase)`. A `consumed` flag prevents
  double-teardown. No framework-package changes; no phase-module changes.
- Deleted dead code: `create_`/`destroy_`, `disposers`, `activeTeardown`,
  `executePhase`, old `handleCurrentPhase`, `phaseHandlers` registry, unused
  `handleCombatPhase` import. `advancePhase`/`finishPhase` unchanged.
- Docs: AGENTS.md pattern #8 rewritten; framework-formalization.md Phase D
  note updated.

**Verification:** phaser typecheck + lint + jest (9), framework typecheck +
jest (28), `npm run build` — all green. Interactive smoke (full phase loop,
destroy paths) left for the repo owner.

---

## Phase-scoped events — `ctx.listen()` (2026-08-03, Cline)

Added phase-scoped event subscriptions to `@mana/framework` and migrated the
Battleground combat/victory phases off the module-level `combatListeners`.

**Why:** phase handlers previously had no scoped listener mechanism — every
listener was registered at the screen level in `events()` for the whole screen
lifetime, or leaked via manual closure disposers. This caused two concrete bugs
in BattlegroundScreen:
- `combatListeners` (an array of disposers created at module **import time**)
  was never re-subscribed on a second battleground entry, after `destroy()`
  ran the stale disposers and `.clear()`ed every `BattlegroundEvent` — combat
  Continue/Replay/Pause silently broke.
- `combatListeners` stayed active during `victory`/`game_over`, so a single
  Continue click on the victory screen fired **both** the combat `end_combat`
  handler and the victory `victory` handler (the `__DEV__` phase-guard throws
  were symptoms).

**What was done:**

- `framework/src/createScreen.ts`: added `ctx.listen(event, cb)` to `ScreenCtx`.
  Subscribes for the **current scope's lifetime** — phase handler → disposed on
  phase switch / `ctx.refresh()`; persistent `create` layer → survives
  transitions, disposed on screen destroy. Implementation wraps the disposer
  returned by `Event.listen()` in a tracked `Destroyable`, reusing the existing
  `PhaseTracker` scope machinery (~3 lines, no breaking API change; existing
  screens untouched).
- `framework/src/createScreen.test.ts`: 3 new tests (31 total) — phase listener
  disposed on phase switch; persistent listener survives switches + dies on
  destroy; `refresh()` re-registers phase listeners.
- `phaser/.../Phases/Combat/handleCombatPhase.ts`: `CombatPhase(ctx)` now
  registers its 5 listeners (continue/replay/pause/resume/playbackFinished)
  via `ctx.listen`; **deleted** the module-level `combatListeners` array.
- `phaser/.../Phases/Victory/handleVictoryPhase.ts`: `VictoryPhase(ctx)`
  registers the continue→victory handler via `ctx.listen`; dropped the manual
  `unlisten` closure dance.
- `phaser/.../BattlegroundScreen.ts`: removed the `combatListeners`
  import/spread; `combat`/`victory` phase entries pass `ctx` to their handlers.

**Verification:** framework jest 31 green + typecheck clean; phaser typecheck
clean; eslint clean on the 3 changed phaser files; phaser `src/` jest 9 green
(pre-existing unrelated failures remain in `supabase/functions` Deno tests).
Docs: AGENTS.md patterns #2/#8 updated.

---

## Split the `combat` phase into playback + client-only results phases (2026-08-07, Cline)

**Context:** The single `combat` phase handled both battle playback *and* the
per-round victory/defeat results overlay, plus weaved teardown through a module
`container.once("destroy", cleanup)` and a module-global
`lastCombatTrackerState` consumed directly by `CombatStatsTable`. The server
already knows the outcome (`combatState.wonCombat`) at `start_combat`, so the
results are a pure client-presentation concern.

**What was done (client-only, no `core/` or server changes):**

- `phaser/.../Phases/Combat/handleCombatPhase.ts`: `combat` is now playback only
  (pause/resume/playbackFinished). On `playbackFinished` it captures the stats
  snapshot and `ctx.go(combatState.wonCombat ? "combat_victory" : "combat_defeat")`.
  Added `CombatVictoryPhase` / `CombatDefeatPhase`, each rendering the existing
  `VictoryUI`/`DefeatUI` and registering `continue`/`replay` via `ctx.listen`.
  Deleted `showCombatResults` / the one-shot listeners / the
  `getLastCombatTrackerState` global / the board-resetting `cleanup` on the
  container.
- Teardown split: `teardownPlayback` (unpause + stop loop, runs on
  `combat -> results` — **does not** touch the board, so the frozen battle board
  stays behind the overlay) vs `teardownCombat` (resummon player team, clear
  ForceStats + combatState, run on **Continue only**, NOT Replay — so the
  `combatState` needed to replay stays intact). Runs before `dispatchAction({type:"end_combat"})`
  because `phaseFinished.emit` awaits the full next-phase transition; teardown
  after it would race the new phase's `create`.
- `CombatStatsTable` / `VictoryUI` / `DefeatUI`: the tracker state is now passed
  as a parameter instead of reading the module global.
- `BattlegroundScreen.ts`: widened the client phase type to
  `Models.PhaseType | "combat_victory" | "combat_defeat"` (client-only view
  states, not present in `session.phase`) and registered the two phases.
  Saved-game resume still lands at `combat` playback regardless of prior view state.

**Verification:** phaser `tsc --noEmit` clean; eslint clean on all 6 changed files;
phaser `src/` jest 9 green (pre-existing unrelated failures remain in
`supabase/functions` Deno tests). Docs: AGENTS.md pattern #8 updated.

