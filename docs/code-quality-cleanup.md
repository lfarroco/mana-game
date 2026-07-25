# Code Quality Cleanup — `phaser/`

Cleanup plan produced from a static + tool-verified analysis of the `phaser/`
directory (running `tsc --noEmit`, `eslint`, `jest`, `playwright test --list`).

- **Date**: 2026-07-25
- **Branch**: `single_scene`
- **Scope**: `phaser/` client only (the `core/` package is in good shape)

## Current state (verified)

| Check | Result |
| --- | --- |
| `tsc --noEmit` | ✅ clean, all strict flags on |
| `eslint` | ✅ clean, `no-explicit-any` enforced |
| File granularity | ✅ 192 files / ~17.9k LOC, largest file 620 LOC |
| Unit tests in `phaser/src` | ❌ **0 files** — `npm test` exits 1 ("No tests found") |
| Unit tests in `core/` | ✅ 27 test files |
| Playwright e2e | ❌ **0 tests collected** (broken imports) |
| CI `unit-tests.yml` | ❌ red — runs `npm run test:ci` in `phaser/` |

The source code itself is strict, lint-clean, and well decomposed. The
problems are in the **scaffolding**: dead files, stale configs, broken test
pipelines, and artifacts left behind by the `single_scene` + `core/` migration.

---

## ⚠️ Scope note: multiplayer backend will be reimplemented

All multiplayer/backend logic in this directory is slated for a rewrite. The
existing inventory (to be removed or replaced):

- `phaser/supabase/` — 29 files: edge functions (`action`, `auth-steam`,
  `replay-commit`, `get-enemy-team`, `_shared/`), migrations, tests, `.temp/`
- `phaser/src/RemoteServer.ts` — only consumer of `@lib/supabase`
- `phaser/src/lib/supabase.ts` — Supabase client wrapper
- `phaser/src/Screens/ArenaLobby/` — `ArenaLobbyScene.ts` + `arenaTheme.ts`
  (already dead code: never imported; `main.ts` only registers the `Client` scene)
- `phaser/src/GameServer.ts` — `getServer()` routes non-singleplayer sessions
  to `RemoteServer`
- `phaser/scripts/bundle-edge.ts` — edge-function bundler
- `package.json` scripts: `test:supabase`, `bundle:edge`, `deploy:functions`
- Dependency: `@supabase/supabase-js`
- Docs to rewrite when the new backend lands: `docs/supabase-backend.md`,
  `docs/multiplayer-architecture.md`, `docs/guest-auth.md`,
  `docs/single-multiplayer-unification.md`

**Rule: do NOT invest effort fixing bugs in this code** (e.g. the
`ArenaLobbyScene` leaderboard `@ts-expect-error`, the `RemoteServer` player-id
collision space). Quarantine or delete it instead. Until the reimplementation
lands, prefer making `getServer()` single-player-only and removing the
Supabase client path, so the client compiles and runs with no dead backend
dependencies.

---

## Action plan

### 1. Fix the test pipelines (CI currently red) — effort: S

- [ ] Prune stale `moduleNameMapper` entries in `jest.config.cjs` that point to
      deleted dirs: `@Core/*→src/Core`, `@Screens/*→src/Client/Screens`,
      `@Engine/*→src/Client`, `@Data/*`, `@Effects/*`,
      `@TriggerSystem/*→src/TriggerSystem`, `@Multiplayer/*`, `@Game/*`
- [ ] Fix `collectCoverageFrom` (references deleted `src/Core/**`)
- [ ] Either restore meaningful unit tests in `phaser/src` (test-utils and
      `__mocks__/phaser.ts` already exist) or add `--passWithNoTests` short-term
- [ ] Playwright: `e2e/game.e2e.spec.ts` imports missing modules
      (`./battleground-scenarios.e2e`, `./unit-effects.e2e`) — restore or remove
- [ ] Playwright: `battleground.e2e.ts` / `board.e2e.ts` don't match the default
      `testMatch`; add `testMatch: /.*\.e2e\.ts/` or rename to `*.spec.ts`
- [ ] Fix `test:e2e:game-flow` script → points to nonexistent `e2e/game_flow.spec.ts`

### 2. Remove dead code — effort: S

- [ ] Delete `src/Screens/ArenaLobby/` (612-line scene + theme; unimported;
      contains a guaranteed runtime crash at `ArenaLobbyScene.ts:471-473` —
      commented-out fetch + `@ts-expect-error test` reading `result.page`).
      *Covered by the multiplayer reimplementation note above.*
- [ ] Delete `src/MockPhaser.ts` (275 lines, unreferenced; superseded by
      `src/test-utils/__mocks__/phaser.ts`)
- [ ] Delete `log.js` (unreferenced Phaser-template analytics phone-home script)
- [ ] Delete `runServerDemo.js` (references deleted `src/Scenes/...` path) and
      stray `simple_test.ts`
- [ ] Remove commented-out class block in `RemoteServer.ts:41-53` and the
      commented `MultiplayerManager` call (or delete the file entirely per the
      multiplayer note above)
- [ ] Remove broken `server` / `server:agents` scripts (`server/index.ts` moved
      to the repo-root `server/` package)

### 3. Quarantine the multiplayer client path — effort: M

- [ ] Make `GameServer.getServer()` single-player-only (drop the `RemoteServer`
      branch) until the backend is reimplemented
- [ ] Delete `src/RemoteServer.ts` + `src/lib/supabase.ts`
- [ ] Remove `@supabase/supabase-js` dep and the `test:supabase`, `bundle:edge`,
      `deploy:functions` scripts; archive or delete `phaser/supabase/` and
      `scripts/bundle-edge.ts`

### 4. Dependency cleanup — effort: S

- [ ] Remove unused deps: `express`, `pg`, `@types/express`, `@types/pg`,
      `uuid`, `delaunator` (zero imports in `src/`, `scripts/`, `e2e/`)
- [ ] `check-balance` uses `npx ts-node -r tsconfig-paths/register` but neither
      package is in devDependencies — migrate the script to `tsx` (already a
      dep) or pin the packages

### 5. Repo hygiene — effort: S

- [ ] `git rm --cached phaser/debug_log.txt` (committed log artifact)
- [ ] Ensure local artifacts stay ignored (working-tree `log.log`,
      `test_output*.log`, `e2e-test-output.log`, `dist.zip` are covered by the
      root `*.log` rule; `debug_log.txt` slipped through as a `.txt`)

### 6. Structural refactors — effort: M

- [ ] Extract a screen-lifecycle helper to dedupe the copy-pasted
      `init/destroy/disposers/initialized` block in `TitleScreen`,
      `OptionsScreen`, `BattlegroundScreen`, `CrystalSelectionScreen`
- [ ] Reduce module-level mutable singletons (36 files use module-scope `let`
      UI state); stop exporting mutable bindings (`export let resultsContainer`,
      `export let isOpen` in `ResultsUI.ts:29-31`) — expose getter functions or
      factory-created closures instead
- [ ] Route all session writes through `env.updateState(...)` instead of direct
      mutation (`LocalServer.ts` does `env.state.session = result.session`)

### 7. Minor fixes — effort: S

- [ ] `Client.ts:103`: replace `parseInt(value * 100 + "")` with `Math.round`
- [ ] `TitleScreen.checkUnlocks`: use `env.time.delay` instead of `setTimeout`
      (respects the scene clock / pause)
- [ ] ~~`RemoteServer` player-id collision space~~ — moot per the multiplayer
      note (file will be removed)
- [ ] `ForceStats.ts:27-28`: replace inline `import("@game/Models")` type
      annotations with top-level imports; drop the `currentCombatState!`
      non-null assertion
- [ ] `config.ts`: avoid reading `window.location` at module import time

### 8. Documentation — effort: M

- [ ] Update `AGENTS.md` + `docs/` to the current `Screens/` + `core/` layout
      (they still describe `Core/`, `Engine/Scenes/`, `Systems/CombatPhase.ts`,
      `MultiplayerManager.ts`)
- [ ] Repoint the vestigial eslint `no-restricted-imports` rule for `src/Core/**`
      to the real `core/` package
- [ ] Mark `phaser/ENV_MIGRATION_PLAN.md` / `ARCHITECTURE_PROPOSALS.md` as
      completed/superseded, or fold remaining items into the task queue

---

## Verification

After each step, re-run:

```bash
cd phaser
npm run typecheck   # tsc --noEmit — must stay clean
npm run lint        # eslint — must stay clean
npm test            # jest — must find and pass tests
npx playwright test --list   # must list the e2e specs
```

