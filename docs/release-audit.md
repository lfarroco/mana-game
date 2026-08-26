# Release Audit — Mana Battle (2026-08-25)

Result of the release-blocker audit run 2026-08-25 (post engine-overhaul +
multiplayer). Records what was fixed and what still needs a human. Reference
for another agent picking up where this run stopped.

## Verification baseline (all green, run 2026-08-25)

| Package | Tests | Typecheck | Lint |
|---|---|---|---|
| `core` | 719 / 77 suites | ✅ | — |
| `framework` | 60 / 7 suites | ✅ | — |
| `server` | 223 / 18 suites | ✅ | — |
| `phaser` | 74 / 11 suites | ✅ | ✅ |

- `npm run build` (webpack prod): ✅ succeeds; bundle 374.74 kB brotlied vs the
  1.2 MB `size-limit` cap. Re-verified after the item-1 guardrail: a build with
  `MANA_SERVER_URL` + `MANA_ITCH_CLIENT_ID` bakes both into the bundle and
  prints no warnings; a bare build warns (and bakes the localhost fallback).
- Steam depot configs (`steam/steam_config/*.vdf`) match the electron-builder
  output dirs (`win-unpacked`, `mac-universal`, `linux-unpacked`).
- Manual Steam auth smoke test passed 2026-08-20 (real ticket end-to-end).

## Findings & dispositions

### 1. 🔴 Release builds must bake `MANA_SERVER_URL` / `MANA_ITCH_CLIENT_ID` — FIXED (guardrail + docs)

These are webpack `DefinePlugin` values baked at **build time**
(`phaser/webpack/config.base.cjs`). Empty → runtime fallback
`http://127.0.0.1:8787` (the player's own machine) / browser login disabled.
The 2026-08-25 build of `dist/bundle.min.js` contained `127.0.0.1:8787` and no
`api.manabattle.com` / itch client id.

- **Fixed**: `config.base.cjs` now prints a loud warning whenever a production
  build lacks either value (`isProd: true` passed from `config.prod.cjs`).
- **Fixed**: `.env.example`, `README.md` (Publishing), and
  `docs/building-and-running.md` (Building for Production) now document/set the
  values. The Makefile already sources + exports the root `.env`, so setting
  `MANA_SERVER_URL=https://api.manabattle.com` there bakes it into every
  `make electron-build-*` release build.
- **Still manual**: the actual release run must be made with the env set (or
  present in root `.env`). Nothing can enforce the author's terminal — the
  warning is the tripwire.

### 2. 🔴 Legacy single-player saves — FIXED (namespace bump + hardening)

Pre-overhaul saves lived under `mana_session_*` with an incompatible
`SessionData` shape (`current_options` vs `options`, no `session_type`, no
`runStats`/`combatState`) and could crash boot or resume — the loader had no
try/catch and ran at module load. Old SessionManager had try/catch; the
overhaul's rewrite lost it.

- **Fixed** (`core/src/session/sessionStore.ts`): `STORAGE_PREFIX` bumped to
  `mana_session_v2_`; `loadAll()` sweeps legacy `mana_session_*` keys; corrupt
  JSON and shape-mismatched saves are skipped instead of throwing. Old saves
  are never loaded (no migration — deliberate, small player base).
- Tests added in `core/src/session/sessionStore.test.ts` (corrupt JSON, bad
  shape, legacy purge).

### 3. 🟠 itch.io multiplayer — NEEDS HUMAN VERIFICATION (cannot be fixed from the repo)

Implemented + unit-tested, never smoke-tested on the live embed, and the
deployed-server env was not re-checked after the 2026-08-24 Steam-endpoint fix.
Follow **`docs/itchio-auth.md` → "D3 verification checklist"**:

- Confirm the VM `.env` has `MANA_ITCH_ENABLED=true` (`compose.yaml` defaults
  `false`, so a default deploy has the itch login route disabled) and
  `MANA_CORS_ORIGIN` = the itch origin (or `*`).
- `curl -X POST https://api.manabattle.com/api/v1/auth/itch` must NOT 404.
- Run the D3 manual smoke test on the live itch embed.

### 4. 🟠 E2E suite — BROKEN (unresolved)

`phaser/e2e/smoke.e2e.ts` lists but does not pass: on 2026-08-25 the single
Playwright test hung (video recorded, no completion within ~6 min). Known since
`docs/code-quality-cleanup.md` (2026-07-25) and `docs/improvement-roadmap.md`
("broken debugController import" — that import has since been replaced by the
`window.__debug` controller). Next steps for the next agent:

```sh
# Kill any stale webpack dev server on :8080 first — playwright.config reuses
# an existing server outside CI (reuseExistingServer: !CI).
cd phaser
npx playwright test e2e/smoke.e2e.ts --reporter=line
```

The test drives a full single-player run through `window.__debug`
(`installDebugCommands`, gated behind `__DEV__`).

### 5. 🟠 CI workflows reference nonexistent scripts — BROKEN (decision needed)

- `.github/workflows/platform-build-verification.yml` runs
  `npm run electron:build:linux|mac|win` — **no such scripts** in
  `phaser/package.json` (real targets: `make electron-build-*` →
  `npx electron-builder --<os> --dir`). The workflow fails immediately.
- `.github/workflows/publish-steam.yml` runs `npm run electron:build:all`
  (nonexistent) and its `game-ci/steam-deploy` depot mapping is an explicit
  placeholder (`depot1Path: phaser/dist-electron` + "The user will need to
  fill this in").
- `.github/workflows/publish-itch.yml` builds with no
  `MANA_SERVER_URL`/`MANA_ITCH_CLIENT_ID`, so a CI-published itch build would
  ship with broken multiplayer (see item 1).
- **Options**: delete the two broken workflows, or fix them to mirror the
  Makefile targets and bake the release env from repo secrets. Manual release
  paths (`make electron-build-all` + `make steam-publish`; `npm run build` for
  itch) are the current source of truth.

### 6. 🟠 Android repo hygiene — FIXED

- `android/key.jks` was committed to git. Untracked (`git rm --cached`; the
  file stays on disk, now gitignored). Android has not been launched, so the
  keystore was never used for a published build — no signing-key rotation
  required. It remains in git history (`1eee985b`); purge with
  `git filter-repo` only if the repo is shared widely.
- Committed gradle outputs (`android/app/release/**`) untracked + gitignored.
- `.gitignore`: replaced the wrong `phaser/android/key.jks` entry and a broken
  absolute path (`/Users/<redacted>/.../releasek`) with `android/key.jks`,
  `android/app/build/`, `android/app/release/`.
- Note: `phaser/.env` + `phaser/.env.example` still carry dead Supabase creds
  from the retired backend (`phaser/.env` is gitignored/local; `.env.example`
  is committed with a now-meaningless publishable anon key). Delete when
  convenient.

## Other notes

- `compose.yaml` defaults `MANA_NODE_ENV=development` — set `production` on the
  VM if it changes logging/behavior.
- Core P1/P2 leftovers (pending design decisions, not blockers):
  `pendingCombatState` module singleton, three divergent rank-up formulas,
  throw-vs-`Result` policy, `noUncheckedIndexedAccess`/`Option` adoption, no
  lint/CI for `core` — see `docs/core-code-quality.md`.

