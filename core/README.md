# @mana/core — Shared Game Logic Package

_Started: July 18, 2026 (proof of concept)_

## Intention

Mana Battle's game rules must execute identically in three environments:

1. **The Phaser client** (`phaser/`) — single-player runs combat simulation
   in-process through a local server adapter. Offline single-player on
   desktop/Android is a core feature, so the logic ships in the client bundle.
2. **The Node agent server** (`server/`) — an experimental LLM play service
   that drives games through `GameLogic` (exploratory, not yet running).
3. **Supabase edge functions** (`phaser/supabase/functions/`) — action
   handling, replay validation (`replay-commit`), enemy team generation.

Historically all of this logic lived inside `phaser/src/`, with the boundary
maintained only by convention. This package moves the **pure, deterministic
game logic** out of the Phaser project into a standalone, framework-free
package so that the boundary is enforced by tooling rather than discipline.

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
via `LocalServer`) and the edge functions that validate replays and generate
enemies.

## The three-layer model

| Layer              | Location                                | Contents                                                                                                | Imported by          |
|--------------------|-----------------------------------------|---------------------------------------------------------------------------------------------------------|----------------------|
| **Shared core**    | `core/`                                 | Pure game logic: no Phaser, no browser globals, no Node APIs, no I/O                                    | client, server, edge |
| **Client runtime** | `phaser/src/`                           | Scenes, UI, audio, playback, client adapters (`GameController`, `RemoteServer`, `GameServer` selection) | client only          |
| **Server runtime** | `server/`, `phaser/supabase/functions/` | Persistence, validation, networking, credentials                                                        | server/edge only     |

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
4. **Headless smoke test** — `npm run test:core` (from `phaser/`) runs
   `core/scripts/smoke.ts` in plain Node (no jsdom, no Phaser mock): it
   asserts no browser globals exist after import, and locks the deterministic
   RNG/seed outputs to golden values that server replays depend on.
## Current state (PoC)

Moved so far:

- `core/src/Random.ts` — Mulberry32 seeded RNG, string-to-seed hashing, seed derivation, deterministic shuffles/picks. Zero dependencies.

Consumption points:

- `phaser/tsconfig.json`: `paths["@game/*"] = ["../core/src/*"]`, and
  `rootDir: "../"` (required so files outside `phaser/` are accepted into the
  program; bare `tsc` emit is unused — the client is built by webpack).
- `phaser/webpack/config.base.cjs`: `"@game"` alias → `../../core/src`.
- `phaser/jest.config.cjs`: `moduleNameMapper` for `@game/*`.
- `phaser/package.json`: `test:core`, `typecheck:core` scripts.
- `server/tsconfig.json`: `paths["@game/*"] = ["../core/src/*"]` — the LLM
  agent server now gets real types for moved modules instead of the wildcard
  `declare module "@game/*"` shim in `server/types/phaser-aliases.d.ts`.

Import sites were rewritten `@Utils/Random` → `@game/Random` (14 files) and
`@Core/Seeding` → `@game/Seeding` (7 files).

## Migration plan

### Phase 1 — Decouple the would-be-core from the client (prerequisite)

Known leaks found in the July 2026 audit that block moving larger modules:

- `Core/GameController.ts` imports `@Screens/...` UI modules and uses the
  `state`/`io` browser globals → move it to `phaser/src/Client/` (it is
  client orchestration) or invert the UI calls behind events. (done, moved to
  /Client)
- `Core/SessionManager.ts` and `Core/RemoteServer.ts` touch `localStorage`
  at module scope; `RemoteServer` imports `@lib/supabase` → keep both in the
  client, or inject storage/networking.
- `Core/Combat/RunCombatCore.ts` runtime-imports `@Systems/CountdownTimer`
  (which pulls in Phaser shaders) for a **type only** → `import type` or move
  the state type into core.
- The five de-facto-pure combat systems (`TimeoutDamageSystem`,
  `PoisonDamageSystem`, `RegenSystem`, `StatusEffectSystem`,
  `CombatStatsTracker`) live in `phaser/src/Systems/` → move into `core/`.
- Client-side duplicates of server constants (`MIN_COOLDOWN` in
  `CombatPlaybackController`, orb cooldown constants in `Orbs.ts`) → import
  from core instead.
- `GameController.selectEncounter` mutates `encounter_history` client-side
  before dispatch → move into the server action handler.

### Phase 2 — Move the pure logic

In rough order: `Models/` → `Data/` → `TriggerSystem/` → combat
(`Core/Combat/*`) → `GameLogic`/`SessionTransitions`/`PhaseSystem` →
`Core/Constants.ts` (already marked `// TODO: move to core`) and
`Core/Combat/CombatConstants.ts`.

Keep the existing alias names (`@Models/*`, `@Core/*`, …) but repoint them to
`core/src/...` so import sites don't churn.

### Phase 3 — Server runtimes & formalization

- Delete the `server/types/phaser-aliases.d.ts` wildcard shim once
  `@game/Core/GameLogic` resolves to the real package.
- Consider npm workspaces at the repo root to formalize dependency direction
  (`@mana/core` has zero workspace dependencies).
- Extend ESLint boundaries: ban imports of `@Screens`/`@Client`/`@Systems`
  from anything that moves into `core/`.
- Tighten multiplayer: the "server logs missing → simulate locally" fallback
  in `MultiplayerManager` is dead code (MP is always request-response, so
  the server always provides logs). Remove it or make it fail visibly.

## Validation commands

Run from `phaser/`:

```bash
npm run typecheck        # client, including @game/* resolution
npm run typecheck:core   # this package, standalone
npm test                 # jest (CombatSimulation exercises the moved modules)
npm run bundle:edge      # supabase bundles resolve @game/*
npm run test:core        # headless purity + determinism smoke test
npm run build            # webpack production build
```

Known pre-existing issues (not caused by this migration):

- `npm run lint` has 3 errors (`openOptions.ts`, `BlackHoleState.ts`,
  `applyPersistentPowerDelta.ts`). Notably `Core/Combat/BlackHoleState.ts`
  imports `phaser` directly — part of the Phase 1 cleanup.
- `npm run test:unit` overrides `testPathIgnorePatterns` with only `e2e`, so
  Deno-based tests under `supabase/functions/` get picked up by jest and fail.
  Use `npm test`.

