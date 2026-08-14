# AI Agent Guide — `@mana/core`

Pure, framework-agnostic game logic shared by the Phaser client and the Node
game server. **No Phaser, no DOM, no Node APIs, no I/O.** Full conventions in
[core/README.md](README.md).

## Layout

The public surface is the barrel `src/index.ts` (import as `@game/*`). Real
modules by directory:

- `math/`, `board/` — Random (seeded, deterministic), Geometry, Constants, layout
- `Combat/` — simulation, runner, logger, codec, status systems (poison/regen/timeout), stats tracker, playback helpers
- `Entities/` — Card, Unit, Force factories
- `session/` — SessionManagement (action handlers), SessionTransitions, OptionGeneration, EnemyGeneration, runComplete, sessionStore, seed
- `TriggerSystem/` — the trigger system core + `effects/` per-effect handlers
- `Actions/` — RecruitmentActions, recruitValidation, OrbAndCoreUpgrades
- `Orbs/` — orb definitions & constants
- `data/` — BaseCollection (card registry), effectBuilders, `cards/` (bronze/silver/gold/core card defs)
- `PhaseSystem/` — phase config (`ROUND_PHASES`, `advanceToNextPhase`)
- `types/` — domain types (card, unit, effect, targeting, combat, session, action, player, server); `Models.ts` is a compat shim
- `Achievements/`, `Stats/`, `settings/`, `i18n/`, `descriptions/`, `content/` — player-facing pure logic (achievements, unlocks, options, translation engine, tooltip text, content catalogs)

A few top-level files (`Random.ts`, `SessionManagement.ts`, …) are one-line
`export *` compat shims — prefer the barrel or the real module paths.

## Conventions

Follow the rules in `core/README.md` § "Functional programming conventions":

1. **No `null`/`undefined` in return types** — use `Option<T>` (`Functional.ts`).
2. **No `throw` in pure functions** — use `Result<T, E>`.
3. **Match exhaustively** (`default: never`).
4. **Prefer `readonly`** everywhere — shared mutable state is the top
   determinism bug.
5. **Consumers unwrap** `Option`/`Result` at the I/O boundary.
6. **Mutation contracts are per-module**: combat effect handlers mutate fresh
   combat-state units in place; session action handlers operate on a
   `structuredClone` of the session.

## Verification

```bash
cd core
npm test            # jest suite (66 suites / 602 tests)
npm run typecheck
```

Single file: `npx jest src/path/ToFile.test.ts --runInBand`.