# `@mana/core` — Purity & Quality Analysis

_Date: July 20, 2026 — Updated after purity hardening_

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

### 🧹 Cleanups

7. **Removed unnecessary `async`** from 8 functions: `CombatRunner.finishCombat`, `addShield`, `restoreLife`, `applyPoison`, `applyRegen`, `applyHaste`, `applySlow`, `multiplyPower`.
   - Updated `CombatRunner` type: `finishCombat` now returns `void` instead of `Promise<void>`.

8. **Smoke test** ✅ FIXED
   - Added `tsx` as devDependency.
   - Fixed `pickRandomItemsSeeded` call (was passing string instead of `{ seed: string }`).
   - Fixed `setSeed`/`nextValue` calls (replaced with `nextRandomValue`).

## Remaining Opportunities

### ⚠️ Structural Improvements (Not Yet Done)

- **Split `Models.ts`** (~427 lines) into `Effect.ts`, `Targeting.ts`, `Unit.ts`, `Combat.ts`, `Session.ts`, `Action.ts`.
- **Split `BaseCollection.ts`** (~1330 lines) by faction/tier.
- **`CombatStatsTracker.trackStat`** unused `_env` parameter — remove.
- **Add `core/src/index.ts`** barrel export for clean consumer imports.
- **Add ESLint** to the core package.
- **Add CI** for core package standalone (typecheck + test on PR).

### 🧪 Testing Gaps (Not Yet Done)

**Tested:** CombatSimulation (20 tests)
**Untested:** Random, BoardLogic, Geometry, Card, Unit, Force, PoisonDamageSystem, RegenSystem, StatusEffectSystem, TimeoutDamageSystem, CombatRunner, ScheduledEffects, TriggerSystem + all 14 effects

## Verification

All three validation gates pass:
```bash
npm run typecheck   # ✅ zero errors
npm run test        # ✅ 20 tests pass
npm run smoke       # ✅ purity + determinism verified
```
And the phaser-side typecheck also passes clean.

