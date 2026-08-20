# Purify Plan — Moving Testable Logic Out of `phaser/`

_Audited 2026-08-14. Goal: move as much app behavior as possible out of the
Phaser-bound `phaser/` package into the deterministic, framework-agnostic
`core/` (and where appropriate `framework/`) packages so it can be unit-tested
without running Phaser._

## Why

- `phaser/` is hard to test: it depends on a live Phaser scene (via `@Env`),
  DOM, audio, and assets. 52 tests currently run there, and **every one of
  them tests logic that was already extracted or made injectable** (RemoteServer
  with injected fetch, steamAuth with injected storage, `collapseStatusTickPairs`,
  OptionsStore, SessionManager, `buildRunCompleteSession`).
- Several important game-rule areas in `phaser/` currently have **zero tests**:
  the StatsStore unlock conditions, achievement/victory-tier rules, the
  tooltip/description text layer, and the combat-log status replay mutations.
  These are exactly the rules that break silently.
- Moving them to `core/` makes them run in the deterministic core suite
  (424 tests) with no Phaser/jest-jsdom mocks.

## Baseline (2026-08-14)

| Package | Test suites | Tests | Notes |
|---|---|---|---|
| `phaser/src` | 9 | 52 | All 9 suites test extracted/injected pure logic |
| `core/src` | 41 | 424 | Deterministic, no Phaser/DOM |
| `framework/src` | 7 | 56 | Engine-agnostic |
| `server/` | — | 167 | Imports core via `@game/*` |

## Result (2026-08-14)

| Package | Test suites | Tests | Notes |
|---|---|---|---|
| `phaser/src` | 7 | 38 | Only rendering adapters remain; every test still passes |
| `core/src` | 66 | 602 | +178 game-rule tests across the moved logic |
| `framework/src` | 7 | 56 | Untouched |
| `server/` | — | 167 | Untouched |

Verification commands:

```bash
cd core && npm run typecheck && npm test
cd framework && npm run typecheck && npm test
cd phaser && npm run typecheck && npm run lint && npm test
```

## Audit findings

### A. Pure logic stranded in `phaser/` — move to `core/` as-is

| # | File | LOC | Pure part | Move to |
|---|---|---|---|---|
| A1 | `src/Models/StatsStore.ts` | 303 | Player-stats aggregation + all unlock conditions (`getWins`, `getWinsOrBetter`, `getTotalWinsOrBetter`, per-crystal/tier thresholds), unlock queue (`unlockUnit`, `confirmUnlock`, `lockUnit`, `getPendingUnlocks`, `isUnitUnlocked`), stat recorders (`recordRunStats`, `recordVictory`, `recordUnitUsage`, `checkMostPowerfulUnit`, `getMostUsedUnit`) | `core/src/Stats/` |
| A2 | `src/Models/OptionsStore.ts` + `src/Models/ClientState.ts` | 141+71 | Options schema validation (`loadOptionsFromStorage` field guards, 0–1 ranges, particles enum, speed>0), `defaultSettings`, `PlayerSettings` type, `getUnitAt` | `core/src/Settings/` |
| A3 | `src/SessionManager.ts` | 96 | `prepareSessionForStorage`/`restoreSessionFromStorage` (combatState `unitById` Map↔array), session-store contract over a `StorageProvider` | `core/src/session/store/` |
| A4 | `src/i18n/i18n.ts` | 98 | `t()` with en fallback + `{param}` interpolation, `getName`, `getAvailableLocales`, `getNativeName`, locale tables | `core/src/i18n/` |
| A5 | `src/Screens/Battleground/Phases/Combat/collapseStatusTickPairs.ts` | 47 | Pure combat-log transform (already has a phaser test — move test too) | `core/src/Combat/` |
| A6 | `src/Screens/Battleground/Phases/Combat/logHandlers/arcaneMissileHandlers.ts` + `statusHandlers.ts` | ~120 | Combat-log status replay: `hasted += duration`, `slowed += duration`, `charge += amount` applied to `combatState.unitById` | `core/src/Combat/applyLogEntryToCombatState.ts` |
| A7 | `src/Systems/AchievementSystem.ts` | 162 | `getVictoryTier` (10/8/5), `getAchievementId`, tier-cascade order, eligible crystal list — pure; `window.steamworks.activate` is the only side effect | `core/src/Achievements/` |
| A8 | `src/debug/debugCommands.ts` | 96 | `buildRunCompleteSession` (already tested) | `core/src/session/` |
| A9 | `src/Utils/colorUtils.ts`, `src/utils.ts`, `src/Screens/Battleground/Components/UI/theme.ts` (`mixHexColors`), `src/Models/Abilities.ts` | ~80 | `hexToVector3`, `compactNumber`, `mixHexColors`, `ABILITY_COLORS` — all pure | `core/src/math/` + `core/src/data/` |
| A10 | `src/Components/Board/Board.ts` | 305 | `getTileAt` (pointer→tile), `getSlotPosition` (index→pixel), swap logic in `updateUnitPosition` | `core/src/board/layout.ts` |

### B. Decision logic embedded in Phaser orchestration — extract as pure plan/validate functions

| # | File | What to extract |
|---|---|---|
| B1 | `src/Screens/Battleground/Phases/Shop/purchaseShopUnit.ts` | `PARTY_FULL`/`SLOT_OCCUPIED` pre-validation + `wasUpgrade`/`didAddUnit` outcome detection. **Duplicates core `RecruitmentActions.recruitUnit` and has drifted**: phaser checks `existingUnit.rank > 3`, core checks `existingUnit.rank < 4`; core hardcodes `units.length < 9` instead of `MAX_PARTY_SIZE`. Add shared pure `canRecruitUnit(session, cardId, targetSlot)` |
| B2 | `src/Screens/Battleground/playerBoardSync.ts` | Destroy/summon/refresh diff decision → pure `planBoardSync(team, existingUnitIds)` |
| B3 | `src/Screens/Battleground/Phases/Combat/CombatPlaybackController.ts` | `scheduleAnimations` (timeline: collapse → start/end → sort) + sorted-pointer completion check → pure playback scheduler |
| B4 | `src/Screens/Battleground/Phases/Combat/logHandlers/index.ts` | log-type→handler dispatch table (with FX handlers injected) |
| B5 | `src/Screens/Battleground/Components/ForceStats.ts` | Bar-fill percent math (clamped `life/maxLife`) |
| B6 | `src/Screens/CrystalSelection/Components/keyboard.ts` | Seed paste sanitization (`/\D/g`, `.slice(0,12)`, `parseInt`) and fallback-seed logic |
| B7 | `src/GameServer.ts` | `ServerAdapter` interface duplicates `core/src/types/server.ts` `GameServer` — consolidate the contract |

### C. Engine-agnostic presentation data (move to `core/src/content/`)

| # | File | LOC | Notes |
|---|---|---|---|
| C1 | `src/Screens/Title/Components/tutorialSlides.ts` | 546 | i18n-keyed slides (recently extracted from TutorialOverlay, still in phaser) |
| C2 | `src/Screens/Battleground/Phases/Encounter/Encounter.ts` `allEncounters` | ~140 | 16-entry encounter display registry (i18n keys + min/max round) |
| C3 | `src/Screens/Battleground/Components/Shop/OrbPresentation.ts` | 157 | orb id → name/color/tooltip/icon registry |
| C4 | `src/Screens/CrystalSelection/Effects/updateDisplay.ts` | 92 | `getColorPresetForCrystal` mapping + `buildCrystalDescription` |

### D. Description/tooltip text layer (the biggest testability win)

`src/Components/Chara/CharaTooltip.ts` (398 LOC) — `buildEffectBlock`,
`getReactionDescription`, `getTargetDescription`, `getCompactTargetDescription`
— plus `src/Components/Chara/createDescription.ts` and
`buildCrystalDescription` are **pure BBCode string builders** over
`(unit, power, compactTooltips, i18n)`. Move to `core/src/descriptions/`, passing
`compactTooltips` as a parameter instead of reading `getSettings()`.

### Deliberately left in `phaser/` (already testable via injection, or rendering-only)

- `RemoteServer.ts` (11 tests), `steamAuth.ts` (injected deps), `Env.ts`,
  `phaser-helpers.ts`, all `FX/`, shaders, `Components/*` rendering,
  `Systems/AudioManager`, `Systems/Storage/SteamCloudProvider`.

### Cross-cutting finding: victory-tier duplication

`10/8/5` thresholds exist **4 times** with different sources:
`AchievementSystem.getVictoryTier` (hardcoded 10/8/5),
`ResultsConfig.getVictoryTier` (core constants), `StatsStore` tier recording,
`winsDisplay` bonus indices `[4,7,9]`. Phase C consolidates into one core module.

## Execution phases

Each phase = move code → add core unit tests → update phaser imports to thin
adapters → run verification for both packages. Agents run **in sequence** to
avoid merge conflicts on shared files.

- **[x] Phase A — Pure utilities & data (S):** A9, A10, B6, C4a
  (`getColorPresetForCrystal`), `ClientState` defaults/`getUnitAt`. Done
  (2026-08-14): `math/format`, `math/color`, `data/abilityColors`,
  `board/layout`, `settings/playerSettings`, `data/crystalPresentation`,
  `session/seed`.
- **[x] Phase B — Settings, session store, i18n (S–M):** A2, A3, A4. Done
  (2026-08-14): `settings/options` (parseStoredOptions), `session/sessionStore`
  (consolidates SessionManager + getSinglePlayerData + loadGame),
  `i18n/translator`.
- **[x] Phase C — Stats, achievements, victory tiers (M, highest game-rule
  value):** A1, A7 + victory-tier consolidation + A8. Done (2026-08-14):
  `Achievements/victoryTier`, `Stats/*` (stats + all 19 unlock rules +
  statsStore), `Achievements/achievements`, `session/runComplete`; the 4th copy
  of the 5/8/10 thresholds removed from winsDisplay.
- **[x] Phase D — Description/tooltip text (L):** item D +
  `buildCrystalDescription`. Done (2026-08-14): `descriptions/*`
  (BBCode builders with injected `t` + `compactTooltips`); phaser keeps thin
  2-arg wrappers.
- **[x] Phase E — Combat replay logic (M):** A5, A6, B3. Done (2026-08-14):
  `Combat/collapseStatusTickPairs` (moved + tests),
  `Combat/applyLogEntryToCombatState`, `Combat/playbackScheduler`. **B4 (the
  log-type dispatch switch) done (2026-08-19):** the dispatch decision moved
  to `Combat/logDispatch` — an exhaustive `log.type → handler group` mapping
  plus the `none` no-FX group; the Phaser `logHandlers/index.ts` switch became
  a compile-time-exhaustive FX handler table keyed off that classification
  (new non-`none` log types now fail to compile instead of falling through
  `default`). This also closed the D1/D2 playback gap: silence/dispel entries
  (cast missiles, hit state replay, silence_end, silence_skip charge reset)
  are now handled, and `applyLogEntryToCombatState` replays
  silence_hit/silence_end/dispel_hit.
- **[x] Phase F — Content registries (S):** C2, C3, C1. Done (2026-08-14):
  `content/encounters`, `content/orbPresentations` as i18n-keyed data. **C1
  (`tutorialSlides.ts`) done (2026-08-19)** via the deferred render-layer
  rewrite: slide content (i18n keys, geometry, demo/FX specs) moved to
  `content/tutorialSlides` as pure data; `phaser/` keeps a thin renderer
  (`Screens/Title/Components/renderTutorialSlide.ts`).
- **[x] Phase G — Domain validation & contracts (M):** B1, B2, B7. Done
  (2026-08-14): `Actions/recruitValidation` (checkRecruitEligibility shared by
  shop UI + server rules), `board/boardSync` (planBoardSync), GameServer
  `ServerAdapter` = core `GameServer` (the client-side `& { deleteSession }`
  was removed 2026-08-15 — the server owns the session lifecycle and there is
  no client-delete endpoint), hardcoded `9` →
  `MAX_PARTY_SIZE`. (The `rank>3` vs `rank<4` checks were already equivalent —
  no drift there.)

## Conventions (must hold for every move)

- `core/` is pure: no Phaser, no DOM/browser globals, no Node I/O. Feature
  flags and storage are **injected**, never imported from `@config` or
  `localStorage`.
- Functional style: plain objects, pure functions, `Option`/`Result` instead of
  `null`/`throw` where core does so.
- Export new core modules from `core/src/index.ts` barrel.
- Phaser keeps thin adapters that wire storage/config/events and call the pure
  functions.
- Run `npm run format` at repo root after each phase.

## Definition of done (per phase)

- Pure logic lives in `core/` (or `framework/`) with unit tests exercising the
  moved code paths (including the previously-untested rules).
- `phaser/` files import the moved logic (no dead copies left behind).
- `core` typecheck+test, `framework` typecheck+test, `phaser`
  typecheck+lint+test all green.
- No RNG call order / seed-derivation changes in combat or session logic.

