# Purity Boundary & Replay-Critical Import Rules

_Rewritten 2026-07-25 for the `core/` package layout._

## Overview

All replay-critical game logic lives in the top-level `core/` package
(`@mana/core`), consumed through the `@game/*` path alias. The package is
pure TypeScript: no Phaser, no DOM, no Node APIs, no I/O. This is what lets
combat and session logic run identically in the browser, in unit tests, and
(planned) on the Node game server.

Why it matters:

1. **Deterministic replays** — pure logic guarantees identical results for
   the same seed and inputs.
2. **Portability** — the same rules run on any platform.
3. **Enforcement by tooling** — the boundary is a package boundary, not just
   a folder convention.

## Layers

| Layer | Location | May import from |
|---|---|---|
| Shared core | `core/` | only itself (+ `uuid`) |
| Client runtime | `phaser/src/` | `core/`, Phaser, browser APIs |
| Server runtime | `server/` (planned — see [game-server.md](game-server.md)) | `core/`, Node APIs |

Import rules:

- Anyone may import `@mana/core` via the `@game/*` alias.
- `core/` imports nothing from `phaser/` or `server/`. An ESLint
  import-boundary rule is planned (see [core-code-quality.md](core-code-quality.md), P3).
- Client and server never import each other's runtime code.

## Rules inside `core/`

- No runtime Phaser imports, no browser globals (`window`, `localStorage`,
  `fetch`, timers). `core/tsconfig.json` sets `"types": []` and no DOM lib.
- **Determinism**: all randomness flows through the seeded RNG
  (`core/src/Random.ts`) — no `Date.now()`, no `Math.random()`.
- Functional conventions (see [core/README.md](../core/README.md)):
  `Option`/`Result` instead of `null`/`throw`, explicit mutation model.
- The only runtime dependency is `uuid`.

## Verification

```bash
cd core
npm run typecheck   # strict, zero errors
npm test            # full deterministic suite
```

## Replay-compatibility hazards

Treat any change to seed derivation, RNG call order, or combat timing as a
replay-format version bump: it changes simulation outcomes for a given seed
and invalidates stored sessions/replays. See the "Do NOT fix" section of
[core-code-quality.md](core-code-quality.md) for known examples.

## Related documents

- [core/README.md](../core/README.md) — package conventions and layout
- [combat-architecture.md](combat-architecture.md) — simulate-then-playback pipeline
- [game-server.md](game-server.md) — the planned server consumer of the package
