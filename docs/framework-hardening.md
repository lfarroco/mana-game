# Framework Hardening — `@mana/framework` Improvement Plan

Evaluation of the `@mana/framework` package, produced after completing the
BattlegroundScreen migration (a real-world stress test of the framework's
ergonomics). Validated by reading every module and running a targeted runtime
reproduction for the critical nav-mutex bug.

- **Date**: 2026-08-01
- **Branch**: `single_scene`
- **Scope**: `framework/` (`@mana/framework`) and its consumption in
  `phaser/src/` (ScreenManager adapter, 4 screens). Related docs:
  [framework-formalization.md](framework-formalization.md),
  [battleground-screen-migration.md](battleground-screen-migration.md).

## Current state (verified)

| Check | Result |
| --- | --- |
| `npm run typecheck` (framework) | ✅ clean |
| `npm test` (framework) | ✅ 46 tests / 2 suites green (38 baseline + 8 P0 regression tests, 2026-08-13) |
| Engine imports | ✅ zero — tests run on plain fakes |
| Consumers migrated | ✅ Title, Options, CrystalSelection, Battleground |
| Failure-path coverage | ✅ P0 regression tests added (2026-08-13): nav recovers after a failed transition, `current()` is null after a failure, the original `go()` still rejects, coalescing + same-screen dedupe preserved |

## Verdict

Solid v0.1 with the right shape: engine-free core + hook injection, disciplined
scope (lifecycle + navigation, not a UI toolkit), small API surface, working
screen generator. The BattlegroundScreen migration landed with **zero framework
changes and zero phase-module changes** — strong evidence the abstraction sits
at the right level. Weak spots concentrate in one theme the happy-path tests
don't cover: **what happens when things fail mid-flight.**

---

## ✅ P0 — Nav mutex poisons permanently after a failed transition

**Status**: ✅ FIXED (2026-08-13) — self-healing `then(run, run)` nav chain,
`activeScreen` reset to null on transition failure, optional `onError` hook,
8 regression tests in `framework/src/ScreenManager.test.ts`. Originally
confirmed by runtime reproduction (scratch jest test, since removed).

`framework/src/ScreenManager.ts:95` — `navChain = navChain.then(cb)` has no
rejection handler. When a screen's `create()` rejects:

1. `navChain` becomes rejected; every later `go()` chains onto it with
   `.then(cb)`, so `cb` never runs again. Reproduction result: `go("other")`
   rejected with the *stale original error* and the target screen was never
   created. **Navigation is dead until reload.**
2. `beforeTransition` has already destroyed the outgoing screen while
   `current()` still reports it — the manager registers a destroyed screen as
   active (in production: blank scene, stale `activeScreen`).

**Fix** (in `createScreenManager`):

```ts
navChain = navChain.then(run, run);  // self-healing: run even if the previous nav failed
// inside run, on doSwitchScreen failure: activeScreen = null; hooks.onError?.(err); rethrow
```

- Add an optional `onError` hook so the host can log/report.
- Regression tests: (a) nav recovers after a failed transition; (b) `current()`
  is null after failure; (c) the original `go()` call still rejects to its
  caller.

**Effort**: ~half a day including tests.

---

## 🟠 P1 — Async lifecycle (do these two together)

### P1a. `Destroyable` is sync-only; real teardowns are async

**Status**: confirmed via the BattlegroundScreen migration.

The framework's `destroy(): void` contract can't express real teardowns (shop
`SlideOut`, combat board re-summon). BattlegroundScreen had to hand-roll the
`runPhaseHandler` + `activePhaseCleanup` + `consumed`-flag adapter (see
[battleground-screen-migration.md](battleground-screen-migration.md)); every
future screen with an async teardown would re-invent it.

**Proposal**: widen to `destroy(): void | Promise<void>`; `go()`/`refresh()`
*await* phase teardowns before starting the next handler; screen-level
`destroy()` may stay fire-and-forget (the scene is wiped anyway — the current
battleground semantics). The battleground adapter then collapses to
`return { destroy: teardown }`.

### P1b. `ctx.go()` is not serialized

**Status**: confirmed by inspection; pre-existing exposure carried over from
`BattlegroundScreen.executePhase`.

Async phase handlers can interleave on rapid transitions (two quick
`phaseFinished` emissions). **Proposal**: per-screen promise chain in `go()` —
same pattern as the nav mutex, but built on the P0-fixed, self-healing chain.

**Effort**: 1–2 days for both, including tests and migrating BattlegroundScreen
off its adapter.

---

<!-- PART2 -->
