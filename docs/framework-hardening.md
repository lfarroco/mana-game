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
| `npm test` (framework) | ✅ 51 tests / 2 suites green (46 baseline incl. P0 + 5 P1 regression tests, 2026-08-13) |
| Engine imports | ✅ zero — tests run on plain fakes |
| Consumers migrated | ✅ Title, Options, CrystalSelection, Battleground |
| Failure-path coverage | ✅ P0 regression tests added (2026-08-13): nav recovers after a failed transition, `current()` is null after a failure, the original `go()` still rejects, coalescing + same-screen dedupe preserved. P1 (2026-08-13): async teardowns are awaited, rapid `go()` calls serialize, rejected teardown/create propagate to the caller without poisoning later transitions |

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

## ✅ P1 — Async lifecycle (do these two together)

**Status**: ✅ FIXED (2026-08-13) — async `Destroyable` teardowns awaited on
phase transitions + per-screen self-healing transition chain; 5 regression
tests in `framework/src/createScreen.test.ts`. Both parts landed together
(P1a + P1b); the old `BattlegroundScreen` `runPhaseHandler` adapter was
already gone (phases return `Destroyable`s directly), so no consumer
migration was needed.

### P1a. `Destroyable` is sync-only; real teardowns are async

**Status**: ✅ FIXED.

Widened to `destroy(): void | Promise<void>`. `PhaseTracker.clearPhase()` and
`TrackedGroup.destroy()` are now async; `go()`/`refresh()` **await** the
outgoing phase's teardown (`await tr.clearPhase()`) before running the next
handler. Screen-level `destroy()` stays fire-and-forget (the scene is wiped
anyway — the current battleground semantics): the new `runDestroy()` helper
swallows sync throws and async rejections, and `destroyAll()` no longer
unawaits `clearPhase()`.

### P1b. `ctx.go()` is not serialized

**Status**: ✅ FIXED.

`go()`/`refresh()` enqueue on a per-screen promise chain
(`phaseChain.then(op, op)`) — the same self-healing pattern as the P0 nav
mutex: a rejected transition rejects its own caller but the next queued
transition still runs. `destroy()` detaches the chain (resets it to a fresh
resolved promise and swallows any in-flight outcome so it can't surface as an
unhandled rejection). `runPhase()` additionally bails out
(`if (tracker !== tr) return`) after the exit transition, after
`clearPhase()`, and after the phase handler, so a screen destroyed
mid-transition never runs the next handler or mutates a dead tracker.

**Effort**: 1–2 days for both, including tests. Done — see
`framework/src/createScreen.ts` and the P1 regression section in
`framework/src/createScreen.test.ts`.

---

<!-- PART2 -->
