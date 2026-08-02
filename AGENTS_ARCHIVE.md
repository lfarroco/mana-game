# AGENTS Archive

Completed tasks moved out of [AGENTS.md](AGENTS.md). Newest entries last.

---

## Framework formalization — Phase D: `@mana/framework` package (2026-08-01, Cline)

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
