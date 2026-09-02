# Combat System — Remaining Improvements

> Scope: effect/reaction engine, threshold reactions, combat stats tracking,
> and combat test infrastructure in `core/`.
> Last verified: 2026-07-23 — 381 tests, 27 suites, all passing (typecheck clean).
> Status: P1, P2, P3.1, P3.3, P4.3, and the P5 test gaps were implemented
> 2026-07-23. P3.2, P4.1, and P4.2 remain open (see their sections).

## Recommended order

1. ✅ P1 crash guard — small, prevents a real crash class
2. ✅ P5 test gaps — best ROI; pin existing behavior before refactoring anything
3. ✅ P2 test ergonomics — builders module + `runUntil` helper
4. ✅ P3 design clarity — validation + comments, cheap (3.2 deferred, see below)
5. ✅ P4.3 seed-sweep invariants (no new dependency)
6. ⏳ P3.2 single-source reaction config — do when next adding a reaction type

Ideas considered and rejected are listed at the end to avoid re-proposing them.

---

## Priority 1 — Bugs / crash risks

### 1.1 `trackAction`/`trackStat` crash for units added after `initialize()` ✅ (done 2026-07-23)

**File:** `core/src/Combat/CombatStatsTracker.ts` (`trackAction`, `trackStat`)

```typescript
const stats = trackerState.unitStats.get(payload.unit.id)!; // 💥 if unit not in map
```

`initialize()` snapshots unit IDs at combat start. Both `trackAction` and
`trackStat` dereference the unit with a non-null assertion, so if a unit is
added mid-combat (no current mechanic does this, but future summon effects
would), they crash with `Cannot read properties of undefined`.

**Fix:** lazy-register unknown units instead of guarding with
`if (!stats) return;` — a silent guard would also drop the unit's
contributions from *force* stats, silently breaking `every_100_damage`-style
thresholds for summoned units. Mirror the existing `getForceStats()` pattern
in the same file:

```typescript
function getUnitStatsOrInit(state: CombatStatsTrackerState, unit: Unit): UnitCombatStats {
  if (!state.unitStats.has(unit.id)) {
    state.unitStats.set(unit.id, { unitId: unit.id, forceId: unit.force, /* ...zeroes */ });
  }
  return state.unitStats.get(unit.id)!;
}
```

This fixes the crash *and* makes future summon mechanics correct by default.

**Implemented:** `getUnitStatsOrInit()` lazy-registers unknown units in both
`trackAction` and `trackStat`; the `track*` functions now take the source
`Unit` (not just its id) so the force is known at registration time. Covered
by the "units added after initialize" tests in `CombatStatsTracker.test.ts`.

### 1.2 Runaway combat guard — self-reinforcing effect loops ✅ (done 2026-08-30)

**Files:** `core/src/Combat/CombatRunner.ts` (`runCombat`), `core/src/Combat/CombatStatsTracker.ts` (`getCrossedThresholds`), `core/src/Combat/CombatLogger.ts` + `logDispatch.ts` (`runaway_combat` entry)

Reported crash: stacking regen-theme core orbs — "every 10 regen, charge a
random ally", "every 10 regen, give the core power", "every 10 regen, haste a
random ally" — plus the "when the unit to my left deals damage, charge me"
orb backed a self-reinforcing loop (regen applied → `every_10_regen`
threshold → charge/haste/power → faster casts → more regen). Power grew
super-exponentially until a single regen application was worth thousands of
threshold crossings; the simulation then did unbounded work per frame
(freezing the client / OOM on the log) instead of resolving.

**Fix — three layers in `CombatRunner.runCombat`:**

1. **Per-frame caps** — at most `MAX_DEFERRED_EVENTS_PER_FRAME` (1000) due
   deferred events execute and at most `MAX_THRESHOLD_CROSSINGS_PER_FRAME`
   (500) threshold crossings fire per frame; overflow carries over to the
   next frame (`getCrossedThresholds` gained a `maxResults` param that stops
   consuming levels so nothing is dropped). One frame can never hang the
   client's game tick.
2. **Total-work budget** — `MAX_COMBAT_WORK` (50k) work units (deferred
   event executions + threshold crossings + unit casts); legit combats use a
   few thousand at most.
3. **Total-log budget** — `MAX_COMBAT_LOGS` (20k) entries bounds the log (and
   therefore playback) memory and playback length — the client drains the
   timeline through a bounded FX-per-frame cap
   (docs/combat-playback-performance.md Optimization 1).

When either budget is exhausted the combat ends gracefully as `both_won`
(mirroring the `MAX_COMBAT_DURATION_MS` timeout) with a `runaway_combat` log
entry (classified `none` — no FX handler). Regression tests:
`CombatRunawayGuard.test.ts` (runaway board resolves bounded + `both_won`;
per-frame work stays bounded; a legit high-power board never trips the guard)
and the `maxResults` carry-over test in `CombatStatsTracker.test.ts`.

### 1.3 "Can't react to reactions" — no reaction chains from reaction effects ✅ (done 2026-08-30)

**Files:** `core/src/TriggerSystem/TriggerSystem.ts` (dispatch threads
`isReaction`), `core/src/TriggerSystem/effects/` (`dealDamage`, `restoreLife`,
`addShield`, `applyPoison`, `applyRegen`, `applyHaste`, `applySlow`)

The game rule "you can't react to reactions" was only half-enforced: the
cast-level dispatch already skipped `processReactions` for reaction-sourced
effects, and `on_crystal_hit` was cast-only (C2), but the effect handlers'
internal emits still fired for reaction-sourced basics — a thorns retaliation
that crit could fire `on_crit`, a reaction heal could fire `on_over_heal`, a
reaction haste/slow could fire `re_hasted`/`re_slow` — keeping chain
ping-pong possible.

**Fix:** every effect handler now receives the dispatch's `isReaction` flag
and suppresses its internal reaction emits **and its stat accumulation**
(`CombatStatsTracker.track*`) when the effect was itself a reaction.
Reaction-sourced basics (damage/heal/shield/poison/regen) never fire
`on_crit` or `on_over_heal`, never feed the threshold reactions
(`every_100_damage` / `every_100_heal` / `every_100_shield` /
`every_10_poison` / `every_10_regen`), and reaction-sourced haste/slow never
fire `re_hasted`/`re_slow`. Regression tests: `ReactionNoChains.test.ts`
(thorns crit, heal overheal, shield crit, re-haste, re-slow, and one
threshold-exclusion case per basic).

### 1.4 Threshold burst collapse — same-frame crossings fire once ✅ (done 2026-09-05)

**Files:** `core/src/Combat/CombatRunner.ts` (step 3.5 grouping),
`core/src/TriggerSystem/TriggerSystem.ts` (`burst` param +
`resolveBurstTargets`)

Reported issue: a unit arriving at 25k shield with an `every_100_shield`
reaction generated **250 identical reaction events in a single frame** —
overloading the effects, the combat log (the transmitted event data), and
playback FX. Each crossing fired `processReactions` independently, so a
gigantic stat gain produced one reaction/cast/hit log triple per crossing.

**Fix — collapse, don't repeat:** `CombatRunner` step 3.5 groups consecutive
same-frame crossings of one (force, reaction) into a single **burst** and
fires the reaction once with the crossing count (`TriggerSystem`'s `burst`
param threads into `processEffectIO`):

1. **Linear magnitudes scale × burst** — `increase_power`/`decrease_power`/
   `increase_critical` and the basics (damage/heal/shield/poison/regen)
   multiply by the burst ("every 100 shield → +10 power" fired 3 times
   becomes a single "+30"; total magnitude is conserved).
2. **Duration effects never scale** — `haste`/`slow`/`charge`/`silence`
   apply once per distinct target at their base duration (250 × 500ms haste
   → one 500ms haste per ally, never a 125s stack).
3. **Random targeting samples distinct targets** without replacement
   (`min(burst × count, pool)`), so a burst hits at most the team's 9 units.

Reactors and `when` predicates evaluate once per burst against the pre-burst
board state. Work-budget accounting still charges one unit per crossing, so
the 1.2 runaway guard is unchanged. Regression tests:
`ReactionThresholdBurst.test.ts` (power ×burst, single-crossing unchanged,
haste/charge distinct-target caps, basic ×burst, full-team cap) and the
updated conservation invariant in `CombatInvariants.test.ts`.

---

## Priority 2 — Test ergonomics

### 2.1 Export effect builder functions for tests ✅ (done 2026-07-23)

**File:** `core/src/data/BaseCollection.ts`

Card definitions use builders (`damage`, `shield`, `charge(500, self)`,
`reaction("all", "row_allies", ...)`), but they're not exported. Tests write
verbose inline objects that can drift from real effect shapes (e.g. it's easy
to forget `multiply_power` requires `baseMultiplier`):

```typescript
// Current (verbose, drift-prone):
effects: [{ id: "haste", duration: 2000, targets: { id: "self" } }]

// With builders (desired):
effects: [haste(2000, self)]
```

**Fix:** extract the builders into their own pure module (e.g.
`core/src/data/effectBuilders.ts`) imported by both `BaseCollection.ts` and
tests — rather than re-exporting from `BaseCollection`, which drags the whole
card collection into test scope.

**Implemented:** `core/src/data/effectBuilders.ts` holds all effect/reaction/
targeting builders; `BaseCollection.ts` imports them, and new tests use them
directly (also exported as `EffectBuilders` from `core/src/index.ts`).

### 2.2 Timing sensitivity in threshold tests ✅ (done 2026-07-23)

Several threshold tests depend on exact frame counts (100 frames for 2 hits of
cooldown-500 damage, etc.). If combat timing constants change, these break.
Current workaround: generous `toBeGreaterThanOrEqual`.

**Fix:** add a `runUntil(runner, state, predicate)` helper to the shared test
harness (`core/src/__test_utils__/combatHarness.ts`) that runs frames until a
condition is met (e.g. "until 200 damage dealt") — ~5 lines on top of the
existing `runFrames` loop — or use the full `simulateCombat` for outcome-based
tests. Tests should express intent, not cooldown arithmetic.

**Implemented:** `runUntil` added to the harness; the frame-count-sensitive
"does not fire twice for the same threshold level" test and the new
column_allies / shield-absorption tests use it.

---

## Priority 3 — Design clarity

### 3.1 `position: "self"` is dead code for non-global reactions ✅ (done 2026-07-23)

`processReactions()` filters candidates with `u.id != triggeringUnit.id`
(unless the effect is in `GLOBAL_REACTIONS`). A unit with
`{ position: "self", effectId: "damage" }` will **never** react to its own
damage. This is intentional (prevents infinite loops). The test
`"self: does not react to own effects"` documents the behavior.

**Action:** add a check at card registration time that warns/errors when a
reaction uses `position: "self"` with a non-global `effectId` — this catches
designer mistakes in `BaseCollection` at data-load time. Optionally also
comment the `EffectSourcePosition` type.

**Implemented:** `Card.validateCardDefinition()` flags self + non-global
reactions (including `effectId: "all"`); `registerCard` logs a
`console.warn("cardRegistry", …)` per issue at registration time. The
`EffectSourcePosition` type is commented. Tests in `Card.test.ts`.

### 3.2 Three places to update when adding a reaction type

Adding a new threshold reaction (e.g. `every_500_damage`) requires changes in:
1. `types/effect.ts` — `EffectId` union
2. `Models.ts` — `GLOBAL_REACTIONS` array
3. `CombatStatsTracker.ts` — `STAT_CONFIGS` record + `threshold`/`reactionId`

Missing `STAT_CONFIGS` fails silently (type-checks, no crash, threshold just
never fires). `Models.ts` has an `IMPORTANT:` comment listing the wiring
sites, but nothing enforces it.

**Fix:** derive everything from a single config so omission becomes a
*compile error* instead of a silent runtime no-op:

```typescript
const REACTION_CONFIGS = {
  every_100_damage: { global: true, threshold: { stat: "damageDealt", amount: 100 } },
  on_crit:          { global: true },
  // ...
} as const;

type ReactionId = keyof typeof REACTION_CONFIGS;            // feeds EffectId
const GLOBAL_REACTIONS = keysWhere(REACTION_CONFIGS, (c) => c.global);
const STAT_CONFIGS     = deriveThresholdConfigs(REACTION_CONFIGS);
```

Do this the next time a reaction type is added, not before.

### 3.3 `CombatStatsTracker.trackStat` accumulates but doesn't fire ✅ (done 2026-07-23)

The `STAT_CONFIGS` record has `threshold` and `reactionId` fields, but
`trackStat` only reads `unitStatKey` and `forceStatKey`. The threshold logic
lives in `getCrossedThresholds()`, called from `CombatRunner`. The split is
intentional (avoids circular import) but non-obvious.

**Action:** add a comment in `trackStat` pointing to `getCrossedThresholds`.

**Implemented:** `trackStat` now documents that it only accumulates and that
threshold detection happens in `getCrossedThresholds()` (called per-frame by
`CombatRunner`).

---

## Priority 4 — Larger improvements

### 4.1 Make `scale` application and targeting consistent across effects ⏳ (still open)

`processEffectIO` applies `scale` inconsistently: haste/slow/charge scale
`duration`, power effects scale `amount`, `multiply_power` uses
`Math.pow(multiplier, scale)`. Targeting is also inconsistent: haste, slow,
charge, and power effects go through `resolveTargets`, while damage, heal,
shield, poison, and regen hit *cores* directly.

**Action:** make the semantics explicit — e.g. every targeted effect always
goes through `resolveTargets`, and each effect declares how `scale` applies —
rather than encoding the inconsistency in the dispatch switch.

### 4.2 Explicit seed threading ⏳ (still open)

`pickRandom()` mutates `rng.seed` in place (`core/src/math/Random.ts`), and
effects advance `env.seed` by mutation. Passing and returning the seed
instead would harden replay determinism (server-simulated combat is replayed
client-side from logs) without restructuring anything.

### 4.3 Combat invariants as a seed sweep ✅ (done 2026-07-23)

Invariants worth pinning:
- "Sum of all `damage_hit.lifeDelta` + `poison_tick.lifeDelta` + `timeout_damage_hit.lifeDelta` = initial HP − final HP"
- "For any combat with only `damage` effects, total `damage_cast.amount` = total `damage_hit.amount`"
- "Threshold reactions fire exactly `floor(totalStat / threshold)` times"
- "`haste_end` / `slow_end` logs appear iff hasted/slowed was > 0 and decays to ≤ 0"

**Approach:** run `simulateCombat` over ~50 fixed seeds and assert the
invariants. Deterministic, no new dependency, and doubles as a
replay-determinism check.

**Implemented:** `core/src/Combat/CombatInvariants.test.ts` sweeps 50 seeds
through `simulateCombat` and asserts: per-force life accounting across all
life-affecting log types, damage cast↔hit conservation (≤1 projectile in
flight per damage unit at combat end), exact threshold-reaction counts
(handling the early-exit frame of a direct-damage killing blow), and
haste_end/slow_end presence/absence rules. Same-seed log comparison covers
replay determinism (uuid-generated unit ids are pinned in the harness, as
they are not part of the seeded RNG).

---

## Priority 5 — Missing test coverage ✅ (done 2026-07-23)

Best ROI in this document: pin existing behavior before any refactoring.
Most important row: `applyPersistentPowerDelta` — permanent power is a
run-level mechanic, so a regression there silently corrupts the whole run.

**Status:** all rows covered — `applyPersistentPowerDelta.test.ts` (direct
semantics + cross-combat survival via `bonusPower`/`resetUnitStats`),
shield-absorption tests in `EffectIntegration.test.ts`, direct
`getCrossedThresholds` tests (incl. multi-threshold burst) in
`CombatStatsTracker.test.ts`, `column_allies` positional threshold test in
`ReactionIntegration.test.ts`, and `resolveTargets` `all_allies` + `ofType`
tests in `TriggerSystem.test.ts`. The last row was already covered as noted.

| Gap | File | Why |
|---|---|---|
| **`applyPersistentPowerDelta` cross-combat survival** | `applyPersistentPowerDelta.ts` | Permanent power changes survive combat — only tested indirectly. Run-level impact: highest-priority gap. |
| Damage absorbed by shield | `dealDamage.ts` | `damage_hit` shows `shieldDelta` < 0, `lifeDelta` = 0 when core has shield |
| Multi-threshold burst (500 damage in one hit) | `CombatRunner.ts` / `CombatStatsTracker.ts` | `getCrossedThresholds` while-loop handles this, but the function has **no direct unit tests at all** in `CombatStatsTracker.test.ts` — only indirect integration coverage |
| Positional threshold + `column_allies` | — | Only `row_allies` tested with thresholds; `column_allies` only tested with direct damage |
| `all_allies` + `ofType` filtering | `TriggerSystem.ts` (`all_allies` case in `resolveTargets`) | `targets: { id: "all_allies", ofType: "shield" }` — untested |
| `cooldownMultiplier = 1` when both hasted and slowed | `CombatRunner.ts` (`chargeUnits`) | Existing test covers this (CombatSimulation.test.ts) |

---

## Considered and rejected

Kept here so these ideas are not re-proposed. Do not implement without
re-opening the discussion.

### Effect handler registry instead of the dispatch switch

Replacing the ~125-line switch in `processEffectIO` with
`Record<EffectId, EffectHandler>` buys little and costs type safety:

- Exhaustiveness already exists: the switch ends with
  `const _exhaustiveCheck: never = effect`, so an unhandled `EffectId` is a
  compile error.
- `Effect` is a discriminated union, so each `case` narrows the type
  (`effect.multiplier` is typed inside `case "multiply_power"`). A uniform
  handler signature loses that, and the handlers are genuinely heterogeneous
  (see 4.1).

The actionable part of this idea lives on as 4.1 (consistency fix).

### Return-value effects instead of env mutation (half-purity)

Having effects return `{ deferredEvents, newSeed, logs }` while still mutating
unit state (`life`, `shield`, `hasted`, `power`) is a half-measure: unit state
is where the real mutation lives, so isolated testing would still require a
full `CombatState` — a need already covered by the shared test harness
(`setupCombat` is a one-liner, and effect functions are directly exported).

The honest version is full event-sourcing (effects return events, a reducer
applies them, the combat log *is* the state diff), which would unify with the
simulate-server-side / play-back-client-side architecture. But combat
semantics are ordering-sensitive (`resolveTargets` and reactions read current
unit state mid-tick), so deferred application risks replay-breaking behavior
changes — a deliberate epic, not a drive-by refactor. The salvageable piece
lives on as 4.2 (explicit seed threading).

### `fast-check` property-based testing (as a first step)

Property tests over poorly-shrinking combat states tend to produce flaky,
noisy failures. The seed sweep in 4.3 captures most of the value without a
new dependency. Reconsider `fast-check` only if the sweep is outgrown and
shrinking is actually needed.
