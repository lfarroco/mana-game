# AI Agent Task Archive — Mana Battle

This file stores historical completed-task entries that were moved out of AGENTS.md and PLAN.md to keep the active agent guide concise.

## Completed (Current Session)

Date: 2026-03-20

- [x] Fixed i18n unused catch binding lint error in `phaser/src/i18n/i18n.ts` by removing the unused catch parameter; validated via lint + pre-commit typecheck (Copilot, 2026-03-20)
- [x] Centralized timeout damage magic numbers into named constants in `phaser/src/Systems/TimeoutDamageSystem.ts` (`TIMEOUT_DAMAGE_INTERVAL_MS`, sudden-death threshold, base/growth tuning) with no behavior change (Copilot, 2026-03-20)
- [x] Centralized orb cooldown and trigger-duration magic numbers in `phaser/src/Systems/Shop/Orbs.ts` (`MIN_COOLDOWN_MS`, reduction factor, haste/slow/charge durations) (Copilot, 2026-03-20)
- [x] Centralized remote adapter player-id settings in `phaser/src/Core/RemoteServerAdapter.ts` (storage key, prefix, random max) to remove embedded literals (Copilot, 2026-03-20)
- [x] Centralized core cooldown/stat-scaling magic numbers in `phaser/src/Core/GameLogic.ts` (`MIN_COOLDOWN_MS`, reduction factor, round scaling) (Copilot, 2026-03-20)
- [x] Centralized owned-card border pulse duration in `phaser/src/Systems/Shop/CharaShop.ts` to remove inline animation literal (Copilot, 2026-03-20)
- [x] Centralized stat-based unit unlock thresholds in `phaser/src/Models/StatsStore.ts` for infinite-round and run-total gates (Copilot, 2026-03-20)
- [x] Centralized milliseconds-to-seconds conversion constant in `phaser/src/Systems/Chara/CharaTooltip.ts` to remove repeated duration literals (Copilot, 2026-03-20)
- [x] Centralized countdown timer tick/display thresholds and depth constants in `phaser/src/Systems/CountdownTimer.ts` (Copilot, 2026-03-20)
- [x] Centralized cooldown milliseconds-to-seconds conversion constant in `phaser/src/Systems/Chara/createDescription.ts` (Copilot, 2026-03-20)
- [x] Clarified status effect tick interval constant naming in `phaser/src/Systems/StatusEffectSystem.ts` (`STATUS_EFFECT_TICK_INTERVAL_MS`) (Copilot, 2026-03-20)
- [x] Extracted orb power increase factor constant in `phaser/src/Core/GameLogic.ts` (`ORB_POWER_INCREASE_FACTOR`) (Copilot, 2026-03-20)
- [x] Centralized core float tween offset/duration constants in `phaser/src/Systems/Chara/Chara.ts` (Copilot, 2026-03-20)
- [x] Centralized pop animation duration constant in `phaser/src/Systems/Chara/Animations/pop.ts` (`POP_ANIMATION_DURATION_MS`) (Copilot, 2026-03-20)
- [x] Centralized summon animation duration constant in `phaser/src/Systems/Chara/Chara.ts` (`SUMMON_ANIMATION_DURATION_MS`) (Copilot, 2026-03-20)
- [x] Centralized encounter card animation and layout constants in `phaser/src/Systems/Components/EncounterCard.ts` (icon bounce duration, hover animation, font sizes) (Copilot, 2026-03-20)
- [x] Centralized phase transition delay constants in `phaser/src/Systems/CombatPhase.ts` and `phaser/src/Systems/ResultsPhase.ts` (`COMBAT_START_DELAY_MS`, `RESULTS_START_DELAY_MS`) (Copilot, 2026-03-20)
- [x] Centralized death animation (shatter) constants in `phaser/src/Systems/Chara/Animations/shatter.ts` (shake, ring radius, sampling parameters) (Copilot, 2026-03-20)
- [x] Centralized failed purchase snap-back animation duration in `phaser/src/Systems/Chara/events.ts` (`PURCHASE_FAILED_SNAP_DURATION_MS`) (Copilot, 2026-03-20)
- [x] Centralized encounter card display layout constants in `phaser/src/Systems/Encounter.ts` (card dimensions, spacing, X/Y positioning) (Copilot, 2026-03-20)
- [x] Extracted pop-text animation configuration constants in `phaser/src/Systems/Chara/Animations/popText.ts` (rotation, scale, timing, color palette) (Copilot, 2026-03-20)
- [x] Centralized orb shop UI layout and animation constants in `phaser/src/Systems/Shop/OrbShop.ts` (return duration, font sizes, positioning offsets) (Copilot, 2026-03-20)
- [x] Centralized discard zone UI styling and layout constants in `phaser/src/Systems/Shop/DiscardZone.ts` (dimensions, colors, alpha, shadow offsets, font sizes) (Copilot, 2026-03-20)
- [x] Centralized effect card shop layout constants in `phaser/src/Systems/Shop/EffectCardShop.ts` (card dimensions, spacing, positional offsets, completion delay) (Copilot, 2026-03-20)
- [x] Centralized shake animation constants in `phaser/src/Systems/Chara/Chara.ts` (offset, range, duration, repeat count) (Copilot, 2026-03-20)
- [x] Centralized UI button styling and animation constants in `phaser/src/Components/UIButton.ts` (height, colors, corner radius, font size, tween duration) (Copilot, 2026-03-20)
- [x] Centralized modal animation timing constants in `phaser/src/Components/Modal.ts` (scale-in duration, overlay fade duration) (Copilot, 2026-03-20)
- [x] Centralized crystal selection scene UI layout and animation constants in `phaser/src/Engine/Scenes/CrystalSelection/CrystalSelectionScene.ts` (title/font sizes, button widths, pagination styling, display dimensions, animation timings) (Copilot, 2026-03-20)

## Migrated From AGENTS.md

Migration date: 2026-03-14

### Completed
- [x] `MultiplayerManager` was a singleton class — converted to functional module
- [x] Add keyboard shortcuts
- [x] Document the UI System (components, layout management)
- [x] Document the Effect System (visual effects, particles)
- [x] Document the Options/Preferences System (user settings)
- [x] Document Supabase Backend (Edge Functions, Steam auth, deployment)
- [x] Add comprehensive test coverage for UI handlers
- [x] Implement smooth fade-in/out using Phaser tweens in `AudioManager.ts` (currently uses `setTimeout` delays)
- [x] Add pre-commit hooks (Husky + lint-staged + typecheck)
- [x] Improve test execution speed
- [x] Evaluate if Node.js engine requirement should be formally set in `package.json`
- [x] Fixed drag-to-board shop purchases crashing when the shop Chara was already removed by guarding `getCharaById` in `itemDragPurchaseRequested` and adding a missing-Chara regression test in `itemDragPurchaseRequested.test.ts` (Copilot, 2026-03-14)
- [x] Fixed premature game-over/win checks in results flow by using server-synced current lives/wins (no extra virtual increment), extracted pure outcome logic to `ResultsOutcome.ts`, and added threshold regression tests in `ResultsUI.test.ts` (Copilot, 2026-03-14)
- [x] Fixed end-of-run session stats showing zeros by persisting `runStats` in server-side sessions, syncing combat simulation totals back into `GameLogic`, and reading the provided state in `GameCompleteUI`; covered with `LocalServerAdapter` regression tests (Copilot, 2026-03-13)
- [x] Fixed single-player post-combat round desync by removing client-side round advancement from `src/Systems/ResultsPhase.ts` and covering the continue flow with unit tests in `src/Systems/ResultsPhase.test.ts` (Copilot, 2026-03-13)
- [x] Continued ESLint warning escalation by promoting `@typescript-eslint/no-unused-vars` to error in `phaser/eslint.config.js` and fixing active source violations in `src/Components/cloudBackground/CloudsBackground.ts` (Copilot, 2026-03-13)
- [x] Began ESLint warning escalation by promoting `prefer-const` to error in `phaser/eslint.config.js` and fixing existing `prefer-const` violations in `src/Systems/Chara/ChargeBarDisplay.ts` and `src/Systems/Shop/ShopPanel.ts` (Copilot, 2026-03-13)
- [x] Documented Supabase backend architecture and operations in `docs/supabase-backend.md` (Copilot, 2026-03-13)
- [x] Improved webpack hot reload speed via filesystem cache and faster ts-loader watch mode in `webpack/config.dev.cjs` and `webpack/config.debug.cjs` (Copilot, 2026-03-13)
- [x] Added Jest coverage for Chara input and Shop event handlers; fixed `ownedUnitSold` sale-event ordering and Jest JSON module mapping in `jest.config.cjs` (Copilot, 2026-03-13)
- [x] Improved unit-test execution speed with cached isolated Jest transforms and 2-way CI sharding in `.github/workflows/webpack.yml` (Copilot, 2026-03-13)
- [x] Added battleground keyboard shortcuts for phase actions and synced phase options into client state for shortcut resolution; covered with focused Jest tests (Copilot, 2026-03-13)

## Migrated From AGENTS.md

Migration date: 2026-03-13

### Completed
- [x] Fixed duplicate post-combat upgrade/reaction rerender: in-phase upgrade/reaction selections no longer trigger immediate controller phase refresh before `upgrade_core_done`/`add_reaction_core_done`, preventing repeated upgrade-like screens and incorrect skipped encounter flow (Copilot, 2026-03-12)
- [x] Fixed orb encounter UI transition/rendering: selecting orb encounters now destroys encounter cards before async phase transition (prevents overlap with orb shop), and orb shop items are vertically centered so single-orb encounters appear on mid-screen Y axis (Copilot, 2026-03-12)
- [x] Fixed local post-combat transition crash: `combat_done` is now treated as a system transition action in `PhaseValidator`, so combat result flow no longer fails validation when `current_options` is temporarily empty/null (Copilot, 2026-03-12)
- [x] Fixed pre-combat team rearrangement persistence: `update_team` now validates/applies team position updates in `GameLogic.resolveAction`, so drag-and-drop changes made during the combat warning (`combat_encounter`) are used when combat starts; added regression test in `LocalServerAdapter.test.ts` (Copilot, 2026-03-12)
- [x] Fixed non-responsive/empty encounter choices by enforcing canonical server option shape (`current_options.options`) for local/remote adapters, persisting fallback-generated phase options in `LocalServerAdapter`, and keeping action validation aligned to canonical option objects (Copilot, 2026-03-11)
- [x] Fixed click-purchase double-apply and visualizer error: `itemClickPurchaseRequested` no longer mutates local team/emits success `UnitPurchased` after controller-driven phase sync, preventing duplicate units; hardened `Visualizer.handleUnitPurchased` to skip missing shop chara/UI safely (Copilot, 2026-03-11)
- [x] Fixed unit-shop transition UI layering bug: moved shop panel teardown (`ShopPanel.slideOut`) into `purchaseUnit` controller flow so stale shop options are cleared before next phase render in both single-player and multiplayer; removed late teardown from drag purchase handler (Copilot, 2026-03-11)
- [x] Fixed Supabase auth refresh requests in single-player by lazy-initializing the Supabase client and deferring multiplayer auth session initialization until multiplayer/auth flows are used (Copilot, 2026-03-11)
- [x] Standardized all imports to path aliases: converted 451 relative cross-directory imports across 164 files; added @Storage/*, @Effects/*, @Engine/*, @main aliases; enforced via ESLint no-restricted-imports error rule; added tsconfig.eslint.json to cover spec files (Copilot, 2026-03-12)
- [x] Fixed all 4 failing E2E tests: phase detection (`getCurrentPhase` returns `session.phase` directly), board swap race condition (await Chara creation), shop display wiring (`PhaseManager.renderPhase` shop case uses `ShopPanel`), audio graceful degradation (`playSoundEffect` skips missing cache keys) — all 10 E2E tests now pass (Copilot, 2026-03-12)

- [x] Fixed multiplayer `orb_shop` phase transition: now properly sends `orb_shop_done` to transition to next phase (Copilot, 2026-02-16)
- [x] Added missing `upgrade_core` and `add_reaction_core` phase handlers in multiplayer to display effect card shop (Copilot, 2026-02-16)
- [x] Fixed phase step increment logic: shops no longer increment steps (they're part of the same turn as encounters), ensuring correct 3-encounter sequence before combat (Copilot, 2026-02-17)
- [x] Fixed shop-to-combat transition: shop now properly transitions to encounter phase with combat warning instead of directly to combat phase (Copilot, 2026-02-17)
- [x] Added Node.js engine requirement in `phaser/package.json` (`"engines": { "node": ">=20.0.0" }`) (Copilot, 2026-03-11)
- [x] Replaced audio fade `setTimeout` logic with Phaser tweens in `AudioManager.ts` for smoother transitions (Copilot, 2026-03-11)
- [x] Added pre-commit quality gates with Husky + lint-staged + TypeScript typecheck (Copilot, 2026-03-11)
- [x] Re-enabled automated E2E CI runs by adding `pull_request` trigger for `main` in `.github/workflows/e2e-tests.yml` (Copilot, 2026-03-11)
- [x] Verified Systems consolidation cleanup: no remaining references to `Scenes/Battleground/Systems/` and no legacy directory found (Copilot, 2026-03-11)
- [x] Added automated unit-test CI gate by running `npm run test` in `.github/workflows/webpack.yml` before build (Copilot, 2026-03-11)
- [x] Implemented structured logging system with `Logger.ts`, migrated `AudioManager`, `MultiplayerManager`, `StatsStore`, and `serverCombatDemo`, and documented conventions (Copilot, 2026-03-11)
- [x] Fixed encounter phase skip action in `LocalGameController.ts`: added 'skip_encounter' for encounter phase and 'skip_shop' for shop phase for consistency with `RemoteGameController` (Copilot, 2026-03-11)
- [x] Fixed unit test in `LocalServerAdapter.test.ts` to use correct 'orb_shop_done' action instead of non-existent 'skip_orb_shop' (Copilot, 2026-03-11)
- [x] Investigated E2E test failures (4 tests failing): identified phase system migration as root cause; simplified game_flow test to focus on basic game operation; documented issues in PLAN.md (Copilot, 2026-03-11)
- [x] Documented Options/Preferences System in `docs/options-system.md` with architecture, persistence, and extension guidance (Copilot, 2026-03-11)
- [x] Documented Effect System in `docs/effect-system.md` with playback integration and module-level architecture guidance (Copilot, 2026-03-11)
- [x] Documented UI System in `docs/ui-system.md` with component composition, event flow, and layout/input conventions (Copilot, 2026-03-11)

## Migrated From PLAN.md

Migration date: 2026-03-13

### Completed (moved from roadmap historical section)
- [x] Added Playwright visual regression coverage with baseline snapshots in `phaser/e2e/visual-regression.spec.ts` for title scene, battleground shop phase, and battleground combat phase; validated with `npx playwright test e2e/visual-regression.spec.ts` (3/3 passed) (Copilot, 2026-03-13)
- [x] Closed roadmap sprint item "E2E test fixes (High)": validated Playwright suite now passes end-to-end (`npm run test:e2e` => 10/10 passed), then removed the stale sprint-focus task from `PLAN.md` (Copilot, 2026-03-13)
- [x] Systems consolidation moved from `Scenes/Battleground/Systems/` to `src/Systems/` (historical roadmap entry)
- [x] GameController pattern implemented as unified game-action interface (historical roadmap entry)
- [x] Server-side combat migration completed (headless combat simulation)
- [x] Resolved bugs: game-over match stats zero, match stats persistence across save/resume, and board unit position save consistency
- [x] Added cross-platform CI build verification via `.github/workflows/platform-build-verification.yml`: Electron build validation now runs on Linux/macOS/Windows and Android build validation runs with Capacitor sync plus Gradle debug assemble (Copilot, 2026-03-13)
- [x] Added mutation testing infrastructure with Stryker in `phaser/`: configured `stryker.conf.json` for Core-focused mutation scope, added `npm run test:mutation`, and verified setup with a successful Core-only dry run (`npx stryker run --dryRunOnly --mutate "src/Core/Types.ts" --testFiles "src/Core/**/*.test.ts"`) (Copilot, 2026-03-13)
- [x] Added property-based tests for board game logic using `fast-check`: new `src/Models/BoardLogic.property.test.ts` validates `getEmptySlot`, `findFreeSlot`, and `checkMove` invariants across randomized inputs; verified with `npm run test -- src/Models/BoardLogic.property.test.ts` (Copilot, 2026-03-13)

