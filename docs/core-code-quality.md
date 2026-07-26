# Code Quality — `core/` Improvement Plan

Improvement plan produced from a full manual review of the `core/` package
(every source file, its config, and its consumers in `phaser/` and
`phaser/supabase/`), validated by running the package's own checks and a
targeted runtime reproduction for the critical bug.

- **Date**: 2026-07-25
- **Branch**: `single_scene`
- **Scope**: `core/` (`@mana/core`) only. Companion doc for the client:
  [code-quality-cleanup.md](code-quality-cleanup.md). Prior core audit:
  [../core/ANALYSIS.md](../core/ANALYSIS.md).

## Current state (verified)

| Check | Result |
| --- | --- |
| `npm run typecheck` (core, strict) | ✅ clean |
| `npm test` (core) | ✅ 396 tests / 28 suites green |
| Runtime dependencies | ✅ `uuid` only (and it forces a jest stub) |
| Purity boundary | ✅ no Phaser/DOM/Node imports; `types: []`, no DOM lib |
| Linter / formatter | ❌ none configured for the package |
| CI for core standalone | ❌ missing |

The package is architecturally sound: clean three-layer boundary, good
discriminated-union modeling (`Effect`, `Targeting`, `Action`) with
exhaustive `never` checks, deterministic seeded RNG, and a strong shared
test harness (`__test_utils__/combatHarness.ts`). The issues below are one
confirmed gameplay bug, a cluster of determinism/correctness defects, and
convention drift against the package's own `README.md` rules.

---

## ⚠️ Scope note: multiplayer backend will be reimplemented

All multiplayer/backend logic is slated for a rewrite (see the inventory in
[code-quality-cleanup.md](code-quality-cleanup.md)). Impact on this plan:

- **`core/` itself contains no Supabase runtime code.** The only
  multiplayer-adjacent items are *types*: `types/player.ts`
  (`PlayerProfile`, `RankedPlayer`, `RankedPlayersPage`),
  `MultiplayerQueueType` and the `{ type: "multiplayer" }` variant in
  `types/session.ts`, the `GameServer` interface in `types/server.ts`, and
  the optional `enemyTeam` parameter in
  `SessionTransitions.executeCombatPhase`. Keep them — `GameServer` is the
  client/server boundary the reimplementation will also use — but review
  them when the new backend lands.
- **Do NOT fix the Supabase edge-function drift** found during this review
  (`phaser/supabase/functions/action/index.ts` calls a 4-arg
  `GameLogic.transitionToNextState` and reads `transitionResult.combatResult`,
  neither of which exists in current core; committed `_shared.js` bundles
  predate current core). That code is quarantined and will be replaced.
  Where a step below touches an API the edge functions also use
  (`transitionToNextState`, `CombatState.wonCombat`), it is marked with
  **(MP-rewrite)** so the change is coordinated with the reimplementation
  rather than with the dead code.

---

## 🔴 P0 — Confirmed bug

### 1. Single-player wins are never recorded — effort: S

`CombatSimulation.createCombatState` initializes `wonCombat: false` and
nothing in the core flow ever sets it. `CombatSimulation.determineCombatOutcome`
exists but is never called (it is dead code — only stale Supabase bundles
reference an older variant). `SessionTransitions.transitionAfterCombat`
reads `pendingCombatState.wonCombat`, so `end_combat` **always records a
loss** in single-player (`LocalServer` → `transitionToNextState`).

Reproduced via `tsx` with a guaranteed-win team:

```
outcome log: {"type":"outcome","result":"player_won"}
combatState.wonCombat: false
after end_combat -> wins: 0 losses: 1
```

- [x] Set `combatState.wonCombat = determineCombatOutcome(logs)` at the end
      of `CombatSimulation.simulateCombat` (after log sorting).
- [x] Make `determineCombatOutcome` total: it currently does
      `logs.find((l) => l.type === "outcome")!` and crashes when no outcome
      entry exists (possible if `MAX_FRAMES` is ever hit) — return
      `Option<boolean>` or default to `false` with a `console.warn`.
- [x] Add a regression test in `core/src/session/` (simulate a won combat
      through `transitionToNextState` `start_combat` → `end_combat`, assert
      `wins === 1`). This is also the first `SessionTransitions` test —
      currently zero coverage there.
      - Also added unit tests for `determineCombatOutcome` and `wonCombat`
        propagation in `CombatSimulation.test.ts`.
      - Also fixed `createCombatState.initialUnits` aliasing `units`.
- [ ] **(MP-rewrite)** `phaser/src/RemoteServer.ts` reads `wonCombat` from
      the server response; coordinate with the backend reimplementation,
      not with the quarantined code.
- [ ] **(MP-rewrite)** `phaser/src/RemoteServer.ts` reads `wonCombat` from
      the server response; coordinate with the backend reimplementation,
      not with the quarantined code.

---

## 🟠 P1 — Determinism & simulation correctness

### 2. `applyOrb` discards RNG advancement — effort: S

`SessionTransitions.ts` (~line 257) passes a throwaway
`{ seed: session.seed }` to `OrbAndCoreUpgrades.applyOrb`; `pickRandom`
mutates the wrapper's seed and the result is lost. Consecutive reaction
orbs applied without intermediate RNG consumption repeat identical
"random" picks (still replay-safe, but wrong).

- [x] Pass a holder that writes back (e.g. the session itself) or have
      `applyOrb` return the next seed and assign it in the handler.
      - Changed `applyOrb` return type from `void` to `string` (returns `rng.seed`).
      - Updated `SessionTransitions` to write the returned seed to `session.seed`.
      - Added tests: reaction orbs advance seed, stat orbs don't, consecutive
        reaction orbs advance progressively.
- [ ] Unify the RNG contract while here: `pickRandom` mutates `rng.seed`,
      `nextRandomValue` returns `{ result, seed }` without mutating. Pick
      one convention (prefer: always return the next seed) and apply it to
      `calculateCritical`, `sacrificeEffect`, `buildReaction`.

### 3. `createCombatState.initialUnits` aliases `units` — effort: S

`CombatSimulation.ts:32` assigns the same array (and unit object
references) to both `units` and `initialUnits`. The documented purpose
("used to reset board for replays") is defeated because the simulation
mutates them; `handleCombatPhase.getInitialCombatUnits` then reads the
already-mutated snapshot.

- [x] `initialUnits: clone(units)` (a second, separate clone).

### 4. `on_over_heal` is evaluated at cast time — effort: S

`TriggerSystem/effects/restoreLife.ts:37` computes the overheal condition
when the projectile is *cast*; the heal lands 200 ms later when core life
may have changed, so `on_over_heal` can fire spuriously or be missed. The
variable is also misnamed (`hasOnOverHealReaction` — it checks no
reaction).

- [x] Move the check inside the deferred `execute` closure, against the
      core's life at hit time; rename to `willOverheal`.

### 5. `updateTeamAction` does not validate positions — effort: S

`SessionManagement.updateTeamAction` validates count/id/cardId/rank but
accepts out-of-bounds and duplicate positions — a server-authority hole
once position updates come from clients.

- [x] Reject positions outside the 3×3 board and duplicated slots
      (reuse `Geometry.eqVec2` / board constants).

---

## 🟠 P1 — Structural (state management)

### 6. Remove the `pendingCombatState` module singleton — effort: M

`SessionTransitions.ts:28` keeps combat state in module-level mutable
state — the same anti-pattern the previous audit removed from
`CombatSystemStates`. It works only because the flow is fully synchronous;
it breaks if any handler becomes async and is a hazard for concurrent
server use.

- [ ] Change the action-handler signature to return
      `{ session, combatState? }` (or a small result union) and thread the
      combat state through `transitionToNextState` and
      `transitionAfterCombat` explicitly.
- [ ] **(MP-rewrite)** This changes the `transitionToNextState` result
      shape the (quarantined) edge handler consumes — note it for the new
      backend.

### 7. Three divergent rank-up formulas — effort: M (needs design decision)

- `RecruitmentActions.recruitUnit`: rank +1, maxLife/power ×1.5, **effects
  not scaled**.
- `Entities/Unit.upgradeUnitData` (used by enemy generation):
  `power = source.power × rankMultiplier + bonusPower`, effects scaled via
  `upgradeUnitEffects`.
- `OrbAndCoreUpgrades.applyUpgradeOrb`: ×1.75.

- [ ] Decide the canonical formula (game-design call) and route all three
      paths through one function in `Entities/Unit.ts`.

### 8. Orb registry vs. dispatch mismatch — effort: S–M

- `sacrifice_effect_orb` is defined in `OrbDefinitions` and has UI
  presentation, but `applyOrb` has no branch for it → silent no-op.
- `applyOrb` dispatches stat orbs by string-prefix matching
  (`orbId.startsWith("increase_power_on_")`) instead of the
  `ORB_DEFINITIONS` registry.
- The registry's `"special"` entries duplicate non-orb action ids
  (`increase_core_max_life`, `upgrade_core_power`, `decrease_core_cooldown`).

- [x] Either implement `sacrifice_effect_orb` or remove it from
      definitions + presentation.
- [ ] Dispatch through `ORB_DEFINITIONS` (`kind: "stat" | "special" |
      "reaction"`) and drop the prefix parsing; prune non-orb entries.

---

## 🟡 P2 — Convention alignment (package's own README rules)

### 9. "No throw in pure functions" — 14 throw sites — effort: M

`SessionTransitions` (8), `OptionGeneration.generateShopOptions`,
`generateEnemyTeam` (2), `Random.pickOneUniqueSeeded`,
`TriggerSystem.resolveTargets`, `OrbAndCoreUpgrades.buildReaction`.

- [ ] Decide policy: migrate domain errors to `Result<T, E>`, **or** amend
      the README to allow throws for programmer errors (invalid action
      type, empty card pool) and keep `Result` for expected failures. The
      second option matches current usage better.

### 10. "No null/undefined returns" — `Option` adoption is spotty — effort: M

- `PhaseConfig.getPhaseForTurn` returns `roundPhases[step]`, which can be
  `undefined` but is typed `PhaseType` — unsound; `transitionToNextStep`
  can assign `undefined` to `session.phase`. Fix the return type
  (`PhaseType | undefined` or `Option`) and handle it at call sites.
- `Card.getCardDefinition` silently returns `DUMMY_CARD` for unknown ids —
  dangerous for replay validation (a version-skewed card id silently
  simulates a dummy). Return `Option<CardDefinition>` or fail loudly.
- ~25 non-null assertions (`!`) across `Combat/`, `Entities/`,
  `TriggerSystem/` (`getBattleCore`, `getUnitForce`, `getEnemyForce`,
  Map `has()`+`get()!` pairs).
- [ ] Enable `noUncheckedIndexedAccess` in `core/tsconfig.json` to catch
      the indexed-access class mechanically.
- [ ] Extend `Option` usage where absence is a real case; keep `!` only
      where a game invariant guarantees presence (and say so in a comment).

### 11. Purity / determinism hygiene — effort: S

- `SessionManagement.generateDefaultSeed` uses `Date.now()` +
  `Math.random()` inside a package whose README demands determinism —
  make `seed` a required parameter of `createInitialSession` and move
  default-seed generation to the caller (client/server runtime).
- `CombatSimulation.clone` uses `JSON.parse(JSON.stringify(...))` while
  `SessionTransitions` uses `structuredClone` — pick one
  (`structuredClone` is already declared in `globals.d.ts`).
- Document the mutation model: Poison/Regen/Timeout systems return new
  state (callers reassign into `env.combatStates`), `CombatStatsTracker`
  mutates Maps, effects mutate units — all fine, but say so in
  `core/README.md`.
- `createEncounterOptions` mutates `session.encounter_history` — document
  or make it return `{ options, history }`.

---

## 🟡 P2 — Dead code, duplication, naming

### 12. Dead code removal — effort: S

- [ ] `Random.getDeterministicRandomOptionIndex` (tested but unused).
- [ ] `Unit.isCritical` (unused; semantics of a fixed `"0"` seed roll are
      meaningless anyway).
- [ ] ~60 lines of commented-out handlers in `SessionTransitions.ts`
      (lines ~233–329) and stale commented blocks in
      `executeCombatPhase`.
- [ ] Deprecated leftovers: `Card.registerCollection`, `Card.resetRegistry`,
      `BASE_COLLECTION_DATA` (verify no consumers first).
- [ ] `processReactions`' `units.length === 0` "still in combat" check is
      unreachable (units are never removed mid-combat) — remove or
      implement removal.

### 13. Duplication — effort: S

- [ ] `PoisonDamageSystem.getTickAmount` ≡ `getPoisonRate`;
      `RegenSystem.getTickAmount` ≡ `getRegenRate` — keep one name each.
- [ ] `Card.getAlliedCore` ≡ `getBattleCore`.
- [ ] Constants: `MAX_UNITS`/`BOARD_WIDTH`/`BOARD_HEIGHT` in
      `generateEnemyTeam` vs `Constants.MAX_PARTY_SIZE`;
      `INFINITE_MODE_THRESHOLD` in both `PhaseConfig` and
      `math/Constants`; hardcoded `wins >= 10` / `losses >= 4` /
      `lives: 4` vs `WINS_TO_WIN_GAME` — single source in
      `math/Constants.ts`.
- [ ] Rename the confusing pair `MIN_COOLDOWN` (200 ms, post-action
      refresh) vs `OrbConstants.MIN_COOLDOWN_MS` (1000 ms, orb floor) —
      e.g. `MIN_REFRESH_MS` vs `ORB_MIN_COOLDOWN_MS`.
- [ ] Triplicated upgrade-core / add-reaction option lists in
      `SessionTransitions` (`transitionAfterCombat`,
      `transitionAfterVictory`) — extract builder functions.

### 14. Naming & import paths — effort: S

- [ ] Typos/casing: `upgradeCorepower` → `upgradeCorePower`,
      `decreaseCoresCooldown` → `decreaseCoreCooldown`, `lifeChage` →
      `lifeChange` (`Entities/Force.ts`), `RunCombatCore` alias in
      `CombatSimulation` (module is `CombatRunner`),
      `GenerateEnemyTeam` PascalCase namespace in `index.ts` (also
      duplicates the `EnemyGeneration` export — keep one).
- [ ] Internal imports should use canonical paths (`../math/Constants`,
      `../board/BoardLogic`) — 9 core files currently import through the
      root compat shims (`../Constants`, `../Random`, `../Geometry`,
      `../BoardLogic`). Keep the shims only for `phaser/` compatibility or
      delete them and repoint the alias consumers.

---

## 🟢 P3 — Tooling, tests, docs

### 15. Lint / format / CI — effort: M

- [ ] Add ESLint to `core/` (already on ANALYSIS's list), including an
      import-boundary rule: nothing in `core/` may import from `phaser/`,
      `server/`, or `supabase/`; also `no-case-declarations` (TriggerSystem
      switch declares `const` in unbraced cases).
- [ ] Add Prettier (or eslint formatting rules): mixed tabs/spaces in
      `CombatRunner.chargeUnits`, `OrbAndCoreUpgrades`,
      `CombatStatsTracker`.
- [ ] CI job: `npm run typecheck` + `npm test` in `core/` on PR.
- [ ] Consider `forceConsistentCasingInFileNames` (dir casing is mixed:
      `Combat/`, `Entities/` vs `math/`, `session/`).

### 16. Test gaps — effort: M

- [ ] `SessionTransitions` (zero coverage — would have caught P0).
- [ ] `StatusEffectSystem`, `CombatRunner` (partially covered indirectly
      via integration tests).
- [ ] `BaseCollection` data-integrity test: unique ids, rank 1–4,
      cooldown > 0, ≥1 core card, `validateCardDefinition` clean (runs at
      module load but only warns).
- [ ] `ts-jest` has `diagnostics: false` — acceptable only because
      `typecheck` covers test files; re-enable or document the dependency.

### 17. Doc updates — effort: S

- [ ] `AGENTS.md`: "So far `core/src/Random.ts` and `core/src/Seeding.ts`
      live there" is stale (`Seeding.ts` doesn't exist; most of the logic
      has migrated).
- [ ] `core/src/Event.ts` example imports from `@game/Models` — use the
      direct module path.
- [ ] `core/ANALYSIS.md` "Remaining Opportunities": "Split `Models.ts`" is
      done (`types/` exists); prune the list.
- [ ] `core/src/index.ts` header comment: directory list doesn't match
      actual layout/casing.

---

## ⛔ Do NOT "fix" (replay-compatibility hazards)

- **`Random.stringToSeed`: `hash = hash & hash` is a no-op** (the intent
  was `hash |= 0` for 32-bit wrapping). It is deterministic as-is, so
  leave it — changing it alters every derived seed and invalidates stored
  sessions/replays. Add a comment instead.
- Any change to seed derivation, RNG call order, or combat timing
  (including P1 step 2's contract unification) changes simulation
  outcomes for a given seed — treat as a replay-format version bump and
  coordinate with persisted-session migration.
- The Supabase edge functions and everything under the multiplayer
  backend — quarantined pending reimplementation (see scope note above);
  do not repair the drift, replace it.

## Suggested execution order

1. **Step 1** (P0 bug) — small, unblocks single-player progression.
2. **Steps 2–5** (P1 correctness) — small, independent, high value.
3. **Steps 6–8** (P1 structural) — before more features build on them.
4. **Steps 9–14** (conventions/dead code) — can be done incrementally.
5. **Steps 15–17** (tooling/tests/docs) — CI first, then backfill tests.