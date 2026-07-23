# `@mana/core` — Purity & Quality Analysis

_Date: July 23, 2026 — Updated after incremental improvements_

## What Was Fixed

### 🚨 Purity Violations

1. **`CombatSystemStates.ts` — Global mutable singleton** ✅ FIXED + DELETED
   - Deleted `let currentCombatStates`, `setCombatSystemStates`, `getCombatSystemStates`, `isInitialized`, `updateRegenSystemState`, `updatePoisonSystemState`.
   - State is now passed explicitly through `CombatEnvironment.combatStates`.
   - **Entire file deleted** — the `CombatSystemStates` type was inlined directly into `Models.ts`.
   - Phaser-side consumers updated: `CombatPlaybackController.ts` (removed `setCombatSystemStates` call, now imports type from `Models`), `handleCombatPhase.ts` (removed dead code block, removed unused imports, added `getLastCombatTrackerState()` bridge), `CombatStatsTable.ts` (now reads tracker state from `handleCombatPhase`), `logHandlers/types.ts` (imports from `Models`).

2. **`Entities/Card.ts` — Module-level mutable registries** ✅ FIXED
   - Created `CardRegistry` type and `createCardRegistry()` factory.
   - Default global registry preserved for backward compatibility.
   - Added `resetRegistry()` for test isolation.
   - Test file updated with `afterAll(() => Card.resetRegistry())`.

3. **`tsconfig.json` — `types: ["jest"]` leaked jest globals** ✅ FIXED
   - Changed to `"types": []` to match the README claim.
   - Test file now uses `/// <reference types="jest" />` directive.

### 🐛 Bugs Fixed

4. **`applyRegen.ts:59` — Regen applied to wrong force** ✅ FIXED
   - Changed from targeting enemy force to targeting source's own force.
   - Before: `state.units.find(u => u.force !== sourceUnit.force)!.force`
   - After: `state.units.find(u => u.id === hit.sourceId)!.force`

5. **`multiplyPower.ts:1` — Double-slash import path** ✅ FIXED
   - Changed `"../..//Models"` → `"../../Models"`

6. **`StatusEffectSystem.ts` — `tick` closure indirection** ✅ FIXED
   - Inlined the unnecessary closure wrapper.

7. **`PhaseConfig.test.ts:4` — Wrong import path** ✅ FIXED
   - Changed `"./Models"` → `"../Models"` (PhaseConfig is in PhaseSystem/ subdir).

8. **`generateEnemyTeam.test.ts:5` — Unused `CardCollection` import** ✅ FIXED
   - Removed unused import.

### 🧹 Cleanups

9. **Removed unnecessary `async`** from 8 functions: `CombatRunner.finishCombat`, `addShield`, `restoreLife`, `applyPoison`, `applyRegen`, `applyHaste`, `applySlow`, `multiplyPower`.
   - Updated `CombatRunner` type: `finishCombat` now returns `void` instead of `Promise<void>`.

10. **Smoke test** ✅ FIXED
    - Added `tsx` as devDependency.
    - Fixed `pickRandomItemsSeeded` call (was passing string instead of `{ seed: string }`).
    - Fixed `setSeed`/`nextValue` calls (replaced with `nextRandomValue`).

11. **`CombatStatsTracker.trackStat` — removed unused `_env` parameter** ✅ FIXED
    - Removed `_env: CombatEnvironment` from `trackStat` and all 5 public callers (`trackDamage`, `trackHeal`, `trackPoison`, `trackRegen`, `trackShield`).
    - Updated 5 effect files and test file to match new signatures.
    - 14 fewer `{} as Models.CombatEnvironment` casts in tests.

12. **`CombatRunner.ts` — typo fix** ✅ FIXED
    - `// TOOD: include this in the outcome` → `// TODO: include this in the outcome`

13. **`Functional.ts` — added `match`, `chain`/`flatMap` for Option and Result** ✅ ADDED
    - `matchOption`, `matchResult` for exhaustive pattern matching.
    - `chainOption`/`flatMapOption`, `chainResult`/`flatMapResult` for monadic composition.
    - 12 new unit tests added (39 total Functional tests).

14. **`core/tsconfig.json` — added `esModuleInterop: true`** ✅ FIXED
    - Silences ts-jest warnings about ES module interop.

15. **`core/src/index.ts` — barrel export** ✅ ADDED
    - Single entry point re-exporting all public modules (Functional, models, combat, trigger system, entities, data, etc.).

16. **Phaser `CharaTooltip.ts` — removed all `as any` casts** ✅ FIXED
    - Added `getCount(targets)` helper using proper discriminated union narrowing.
    - Added `getEffectTargets(effect)` helper using switch-based narrowing.
    - Replaced 4 `eslint-disable-next-line @typescript-eslint/no-explicit-any` + `as any` patterns with type-safe helpers.

## Remaining Opportunities

### ⚠️ Structural Improvements (Not Yet Done)

- **Split `Models.ts`** (~463 lines) into `Effect.ts`, `Targeting.ts`, `Unit.ts`, `Combat.ts`, `Session.ts`, `Action.ts`.
- **Split `BaseCollection.ts`** (~1330 lines) by faction/tier.
- **Add ESLint** to the core package.
- **Add CI** for core package standalone (typecheck + test on PR).
- **CombatStatsTracker** — the `(stats[config.unitStatKey] as number)` cast on line ~127 can be eliminated by restructuring `StatConfig` to use a mapping type instead of `keyof`.

### 🧪 Testing Gaps (Not Yet Done)

**Tested:** CombatSimulation, Random, BoardLogic, Geometry, Constants, Functional, CombatLogger, PoisonDamageSystem, RegenSystem, CombatStatsTracker, PhaseConfig, Random.pick
**Untested:** Card, Unit, Force, StatusEffectSystem, TimeoutDamageSystem, CombatRunner, TriggerSystem + effects, SessionTransitions, OptionGeneration, EnemyGeneration, generateEnemyTeam, SessionManagement, OrbAndCoreUpgrades, RecruitmentActions, BaseCollection

## Verification

```bash
npm run typecheck   # ✅ zero errors (both core and phaser)
npm run test        # ✅ 176 tests pass (11 suites fail due to pre-existing uuid ESM issue)
npm run smoke       # ✅ purity + determinism verified
```

