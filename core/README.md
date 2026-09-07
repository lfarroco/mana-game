# @mana/core — Shared Game Logic Package

_Started: July 18, 2026 (proof of concept)_

## Intention

Mana Battle's game rules must execute identically in three environments:

1. **The Phaser client** (`phaser/`) — single-player runs combat simulation
   in-process through a local server adapter. Offline single-player on
   desktop/Android is a core feature, so the logic ships in the client bundle.
2. **The Node game server** (`server/` — see
   [docs/game-server.md](../docs/game-server.md)) — the authoritative
   multiplayer backend.

This package is named **core**, not "server": it is the shared rulebook that
every consumer imports. Server-only runtime code (session persistence, edge
handlers, the express app) does **not** belong here and is never imported by
the client.

### Multiplayer model

Multiplayer uses a straightforward request-response pattern: the client sends
an action, the server processes it and returns the new session state (with
pre-computed combat logs if the action leads to combat). The server is always
authoritative; the client never runs game logic to predict or validate. This
keeps the core package's scope narrow — it powers single-player (in-process
via `LocalServer`) and, once it lands, the game server.

## The three-layer model

| Layer              | Location            | Contents                                                                                               | Imported by          |
|--------------------|---------------------|--------------------------------------------------------------------------------------------------------|----------------------|
| **Shared core**    | `core/`             | Pure game logic: no Phaser, no browser globals, no Node APIs, no I/O                                   | client, server, edge |
| **Client runtime** | `phaser/src/`       | Screens, UI, audio, playback, client adapters (`LocalServer`, `RemoteServer`, `getServer()` selection) | client only          |
| **Server runtime** | `server/` (planned) | Persistence, validation, networking, credentials                                                       | server only          |

**Import rules:**

- Anyone may import `@mana/core` (via the `@game/*` alias).
- `core/` imports nothing from `phaser/`, `server/`, or `supabase/` — no
  aliases exist that point outside the package.
- Client and server never import each other's runtime code.

### Functional programming conventions

All code in `core/` follows these rules, enforced by the `Functional.ts`
primitives (`Option<T>`, `Result<T, E>`):

1. **No `null` / `undefined` in return types** — use `Option<T>`.
   ```ts
   // Before
   function getEmptySlot(…): Vec2 | null { … }

   // After
   import { Option, none, some } from "./Functional";
   function getEmptySlot(…): Option<Vec2> { … }
   ```

2. **No `throw` in pure functions** — use `Result<T, E>`.
   ```ts
   // Before
   function getCollection(id: string): CardCollection {
     if (!exists) throw new Error(`Collection ${id} not found`);
     …
   }

   // After
   import { Result, ok, err } from "./Functional";
   function getCollection(id: string): Result<CardCollection> {
     if (!exists) return err(`Collection ${id} not found`);
     return ok(collection);
   }
   ```

3. **Match exhaustively** — always handle both tags. TypeScript narrows
   `Option` and `Result` via their `_tag` discriminant, so a
   `default: never` branch catches missing cases at compile time.

4. **Prefer `readonly` on all shared data types** — mutable state on
   shared objects (poison rates, RNG seeds, combat state) is the single
   biggest source of non-determinism bugs. Use `ReadonlyMap`, `ReadonlyArray`,
   `readonly` properties, and return new copies instead of mutating in place.

5. **Consumers unwrap at the boundary** — Phaser scenes, server endpoints,
   and edge functions that import from `@game/*` are responsible for
   converting `Option`/`Result` to their native idioms (null checks,
   try/catch) at the I/O boundary.
   ```ts
   import { isSome, getOrElse, unwrapOr } from "@game/Functional";
   const slot = BoardLogic.getEmptySlot(units, "PLAYER");
   const pos = getOrElse(slot, [0, 0]); // supply a default
   ```

6. **Mutation model** — While functional programming is preferred, some
   modules mutate inputs for performance. Calling conventions are documented
   per-module:
   - **Pure (return new state)**: `PoisonDamageSystem`, `RegenSystem`,
     `TimeoutDamageSystem` accept and return new state objects; callers
     reassign into `env.combatStates`.
   - **Mutable**: `CombatStatsTracker` mutates internal Maps during combat
     simulation. Effect handlers (`TriggerSystem/effects/*`) mutate unit
     properties (life, shield, power) in-place on the combat state's unit
     objects — these are safe because the combat state is a fresh clone
     at the start of each combat.
   - **Session mutation**: `createEncounterOptions` no longer mutates the
     input session; it returns the options and the updated encounter history
     separately. All action handlers in `SessionTransitions` operate on a
     `structuredClone` of the session, so mutations during a handler are
     isolated from the caller's copy.

The client shipping the game logic in its bundle is **by design** — single-player
(desktop/Android) must work offline. Multiplayer does not use this bundle path:
the client sends actions and receives server-authoritative results.

## Enforcement gates

1. **TypeScript** — `core/tsconfig.json` sets `lib: ["ES2020"]` (no DOM) and
   `types: []` (no Node), so `window`, `document`, `localStorage`, `process`
   etc. are compile errors inside this package. The package has no path
   aliases pointing outward, so reverse imports cannot resolve.
2. **Webpack / esbuild** — the client resolves `@game/*` via
   `TsconfigPathsPlugin` + an explicit alias; edge bundling
   (`phaser/scripts/bundle-edge.ts`) picks up the same tsconfig paths and
   hard-fails on unresolved bare imports.
3. **Jest** — `phaser/jest.config.cjs` maps `@game/*` to `../core/src/*`.

### Package layout

`src/index.ts` is the public barrel (`@game/index` / `@mana/core`). Map:

- `math/`, `board/` — pure utilities (Random, Geometry, Constants, layout)
- `Combat/` — simulation, runner, logger, codec, status systems, playback
- `Entities/` — Card / Unit / Force factories
- `session/` — management, transitions, option/enemy generation, run-complete
- `TriggerSystem/` — triggers & effects
- `Actions/` — recruitment, orb upgrades
- `Orbs/`, `data/`, `content/`, `descriptions/`, `i18n/`, `settings/`,
  `Stats/`, `Achievements/` — game data, catalogs, and presentation logic
- `PhaseSystem/` — phase config
- `types/` — domain types (`Models.ts` is a backward-compatible shim)

### Compat shims

A few top-level files — `Random.ts`, `Geometry.ts`, `Constants.ts`,
`BoardLogic.ts`, `BaseCollection.ts`, `OptionGeneration.ts`,
`EnemyGeneration.ts`, `SessionManagement.ts`, `SessionTransitions.ts` — are
one-line `export *` re-export shims kept for backward compatibility with
older `@game/*` import sites. Prefer the barrel (`src/index.ts`) or the real
module paths above for new code.

### Consumption points

- `phaser/tsconfig.json`: `paths["@game/*"] = ["../core/src/*"]`, and
  `rootDir: "../"` (required so files outside `phaser/` are accepted into the
  program; bare `tsc` emit is unused — the client is built by webpack).
- `phaser/webpack/config.base.cjs`: `"@game"` alias → `../../core/src`.
- `phaser/jest.config.cjs`: `moduleNameMapper` for `@game/*`.
- `server/tsconfig.json`: `paths["@game/*"] = ["../core/src/*"]` — the server
  resolves real types for moved modules (the old wildcard
  `declare module "@game/*"` shim in `server/types/phaser-aliases.d.ts` is
  gone).


## Validation commands

Run from `core/`:

```bash
npm test            # jest suite (66 suites / 602 tests)
npm run typecheck   # tsc --noEmit
```

`phaser/` and `server/` also typecheck against these sources through their
own tsconfigs (`npm run typecheck` in each), and the client build resolves
`@game/*` via webpack (`npm run build` from `phaser/`).

