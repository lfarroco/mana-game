# AI Agent Guide — `@mana/framework`

> **Being decommissioned (2026-09-08).** Screens are migrating to raw Phaser
> scenes; every screen is migrated except **battleground**, which still uses this
> package through the temporary `LegacyHostScene` bridge. **Do not build new
> screens on `createScreen()`** — extend `ScreenScene` instead and follow
> [docs/scene-migration.md](../docs/scene-migration.md). This package and its
> aliases can be deleted once battleground is migrated.

Engine-agnostic client framework: screen lifecycle, resource tracking, typed
navigation. **Zero engine imports** — Phaser-specific work is injected by the
host via hooks. See [README.md](README.md) and
[docs/framework-formalization.md](../docs/framework-formalization.md).

## Layout

- `Screen.ts` — the `ScreenModule` contract: `{ name, init?, create, destroy?, go?, currentPhase? }`
- `createScreen.ts` — `createScreen(spec)` factory + `screenModule()` export helper; `ScreenCtx`, `Destroyable`
- `phaseTracker.ts` — `PhaseTracker`, `TrackedGroup`, `findTrackedById` (extracted from `createScreen.ts`)
- `ScreenManager.ts` — `createScreenManager({ screens, hooks })`: registry, nav mutex, typed routes, deep-links
- `Router.ts` — `setRouter()` / `go()` / `currentScreen()` typed navigation
- `Event.ts` — re-export of the `Event<T>` primitive from `@mana/core`

## Key concepts

- **Phases**: mutually exclusive sub-states per screen; tracked elements are
  auto-destroyed on phase switch. `ctx.track(obj, { id })` tracks destroyables;
  `ctx.listen(event, cb)` subscribes for the current scope's lifetime;
  `ctx.refresh()` re-runs the current phase.
- **Transitions**: each phase may declare `{ enter, exit }` animations on its
  tracked elements (`screen.startPhaseExit()` runs the exit early — e.g. in
  parallel with a server dispatch — and the next `go()` skips it;
  `screen.restorePhaseExit()` brings the UI back if that work fails).
- **Nav mutex**: all `go()` calls are serialised by a promise chain
  (`then(run, run)` — self-healing), coalesce redundant requests, and drop
  same-screen requests.
- **Async lifecycle**: `destroy(): void | Promise<void>` is awaited on phase
  transitions.
- **Ownership rule**: an event is cleared/destroyed by whoever created it —
  the framework owns screen lifecycle, callers own their own events.

## Verification

```bash
cd framework
npm test            # jest suite (7 suites / 60 tests)
npm run typecheck
```

Single file: `npx jest src/File.test.ts --runInBand`.
