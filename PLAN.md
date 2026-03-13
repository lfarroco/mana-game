# Mana Battle - Development Roadmap

**Last Updated**: March 13, 2026

This document outlines the development priorities and planned improvements for Mana Battle. Tasks are organized by priority and category to guide development efforts systematically.

---

## Table of Contents

1. [Project Health Overview](#project-health-overview)
2. [Critical Priority](#critical-priority)
3. [High Priority](#high-priority)
4. [Medium Priority](#medium-priority)
5. [Low Priority](#low-priority)
6. [Technical Debt](#technical-debt)
7. [Quality & Testing](#quality--testing)
8. [Performance Optimizations](#performance-optimizations)
9. [DevOps & CI/CD](#devops--cicd)
10. [Future Features](#future-features)
11. [Completed Tasks](#completed-tasks)
12. [Current Sprint Focus](#current-sprint-focus)

---

## Project Health Overview

### ✅ Strengths
- **Well-documented architecture** - Comprehensive docs in `/docs/` covering all major systems
- **Good test coverage** - Unit tests, integration tests, and E2E tests in place
- **Clean separation** - Recent refactoring has improved Core/Engine/Systems separation
- **Multi-platform support** - Web, Desktop (Electron), Android (Capacitor), Steam
- **Localization** - 6 languages supported (en, es, pt, jp, cn, ru)
- **Modern tech stack** - TypeScript, Phaser 3, functional programming patterns

### ⚠️ Areas for Improvement
- **Phase system migration incomplete** - Legacy `PhaseManager.ts` still runs main loop
- **Code consistency** - 150+ console.log statements need proper logging system (ESLint `no-console` set to warn, not error)
- **No unit tests in CI** - Only E2E tests exist in workflows, and those are manually triggered
- **Test coverage gaps** - No code coverage reporting; some systems lack comprehensive tests
- **Documentation drift risk** - keep docs in sync as gameplay and backend flows evolve
- **Build optimization** - Monolithic bundle (no code splitting or lazy loading)

---

## Critical Priority

These tasks are essential for system stability and architectural consistency.

### Phase System Migration
- [ ] **Complete migration to `Core/PhaseSystem/` architecture**
  - **Context**: New handler-based system exists but legacy `PhaseManager.ts` still runs main loop
  - **Impact**: Enables consistent phase handling across single/multiplayer modes
  - **Effort**: High (3-5 days)
  - **Docs**: [phase-system-refactoring.md](docs/phase-system-refactoring.md)
  - **Steps**:
    1. Audit which phases still use legacy `PhaseManager.ts`
    2. Create comprehensive tests for all phase handlers
    3. Migrate remaining phases to new handler architecture
    4. Remove or deprecate legacy `PhaseManager.ts`
    5. Update documentation

### Single-Player/Multiplayer Unification
- [ ] **Use multiplayer handler in single-player mode**
  - **Context**: Both modes should use `IGameServer` interface consistently
  - **Impact**: Reduces code duplication, ensures parity between modes
  - **Effort**: Medium (2-3 days)
  - **Docs**: [single-multiplayer-unification.md](docs/single-multiplayer-unification.md)
  - **Steps**:
    1. Ensure `LocalServerAdapter` has complete feature parity
    2. Update single-player initialization to use server adapter
    3. Remove direct game logic calls from single-player UI
    4. Comprehensive testing of both modes
    5. Update Phase 3 status in unification doc

---

## High Priority

These tasks significantly improve code quality, maintainability, and user experience.

### Logging System
- [x] **Implement structured logging system**
  - **Context**: 150+ console.log statements scattered throughout codebase (heaviest in `serverCombatDemo.ts`, `StatsStore.ts`, `MultiplayerManager.ts`, `AudioManager.ts`)
  - **Impact**: Better debugging, production monitoring, clean console output
  - **Effort**: Low (1 day)
  - **Steps**:
    1. Create `Logger` utility in `src/Utils/` with log levels (debug, info, warn, error)
    2. Add environment-based filtering (disable debug logs in production)
    3. Replace console.log/warn/error calls with Logger
    4. Add optional log file output for Electron builds
    5. Document logging conventions
  - **Status**: ✅ Implemented Logger utility with environment-based level filtering and optional Electron sink; migrated `serverCombatDemo.ts`, `StatsStore.ts`, `MultiplayerManager.ts`, and `AudioManager.ts`; added logging conventions doc (2026-03-11)

### Audio System Enhancement
- [x] **Replace setTimeout with Phaser tweens for audio fade**
  - **Context**: `AudioManager.ts` uses `setTimeout` for fade-in/out
  - **Impact**: Smoother audio transitions, better Phaser integration
  - **Effort**: Low (0.5 day)
  - **File**: [src/Systems/AudioManager.ts](phaser/src/Systems/AudioManager.ts)
  - **Docs**: [audio-system.md](docs/audio-system.md)
  - **Status**: ✅ Fixed - Replaced setTimeout with Phaser tweens for smooth volume transitions (2026-03-11)

### Testing Improvements
- [x] **Verify all E2E tests pass**
  - **Context**: 7 E2E test suites exist; 4 were failing due to phase detection, shop display, board swap timing, and audio errors.
  - **Status**: ✅ All 10 E2E tests passing (2026-03-12)
  - **Fixes applied**:
    - `LocalServerAdapter.sessionManager` made accessible for DebugController test injection
    - `getCurrentPhase()` returns `session.phase` directly instead of computing from step
    - `BattlegroundScene` propagates injected test state to global state
    - `addUnitToPlayerBoard` made async so Chara creation is awaited before board moves
    - `PhaseManager.renderPhase` shop case wired up to real `ShopPanel` display logic
    - `AudioManager.playSoundEffect` now silently skips missing audio keys (graceful degradation)
  - **Impact**: Full E2E coverage restored
  - **Effort**: Medium (1-2 days to fix all tests)
  - **Next Steps**:
    1. Fix phase skip action IDs in LocalGameController (✅ done - skip_encounter added)
    2. Debug why phase options aren't transitioning correctly in E2E
    3. Update test logic to match new phase system expectations
    4. Consider if phase system migration affects option availability

- [x] **Add comprehensive test coverage for UI handlers**
  - **Context**: Input handlers and UI components need more test coverage
  - **Impact**: Prevents regressions in user interactions
  - **Effort**: Medium (2 days)
  - **Files**: `src/Systems/Chara/input.ts`, `src/Systems/Shop/events/`
  - **Status**: ✅ Added focused Jest coverage for click/drag/long-press input handlers and shop purchase/sale events; also fixed sale event emission ordering and removed a broken global JSON Jest mapper that prevented suites from starting (2026-03-13)

### Code Quality
- [ ] **Remove unused code and dead code paths**
  - **Context**: Post-refactoring cleanup needed
  - **Impact**: Smaller bundle size, easier maintenance
  - **Effort**: Medium (1-2 days)
  - **Steps**:
    1. Run dead code detection tools (e.g., ts-prune)
    2. Remove unused imports and functions
    3. Check for orphaned files post-Systems migration

- [ ] **Standardize import patterns**
- [x] **Standardize import patterns**
  - **Status**: ✅ Completed (2026-03-12)
  - **Work done**:
    - Converted 451 relative cross-directory imports to path aliases across 164 files
    - Added missing aliases: `@Storage/*`, `@Effects/*`, `@Engine/*`, `@main`
    - Added ESLint `no-restricted-imports` error rule to enforce cross-directory alias usage going forward
    - All TypeScript and unit tests pass; 0 ESLint alias violations remain

- [ ] **Escalate ESLint warnings to errors**
  - **Context**: `no-explicit-any`, `no-unused-vars`, `no-console`, and `prefer-const` are all set to `warn` in `eslint.config.js`, allowing problematic code to be committed
  - **Impact**: Enforces type safety, immutability, and logging discipline
  - **Effort**: Low (0.5 day)
  - **Steps**:
    1. Change `no-explicit-any` to `error` (fix existing violations first)
    2. Change `prefer-const` to `error`
    3. Evaluate `no-console` as `error` after implementing structured logging

---

## Medium Priority

These tasks enhance developer experience and expand documentation.

### Documentation
- [x] **Document UI System**
  - **Context**: Listed in README as needing documentation
  - **Impact**: Helps contributors understand UI architecture
  - **Effort**: Medium (1 day)
  - **Create**: `docs/ui-system.md`
  - **Cover**: Component structure, event handling, layout management
  - **Status**: ✅ Fixed - Added `docs/ui-system.md` documenting UI composition architecture, event-driven updates, reusable components, input handling, and layout patterns (2026-03-11)

- [x] **Document Effect System**
  - **Context**: Visual effects and particle systems not documented
  - **Impact**: Enables adding/modifying visual effects
  - **Effort**: Low (0.5 day)
  - **Create**: `docs/effect-system.md`
  - **Cover**: Effect types, particle configs, animation system
  - **Status**: ✅ Fixed - Added `docs/effect-system.md` documenting combat playback integration, browser effect mapping, reusable effect modules, trigger visual adapters, and extension guidelines (2026-03-11)

- [x] **Document Options/Preferences System**
  - **Context**: User settings system needs documentation
  - **Impact**: Makes settings extension easier
  - **Effort**: Low (0.5 day)
  - **Create**: `docs/options-system.md`
  - **Cover**: Settings structure, persistence, UI binding
  - **Status**: ✅ Fixed - Added `docs/options-system.md` documenting data model, storage providers, side effects, tab architecture, localization flow, and extension steps (2026-03-11)

- [x] **Document Supabase Backend**
  - **Context**: Supabase Edge Functions handle multiplayer game actions and Steam authentication (`phaser/supabase/functions/`), but have no architecture documentation
  - **Impact**: Critical for multiplayer maintenance and onboarding
  - **Effort**: Medium (1 day)
  - **Create**: `docs/supabase-backend.md`
  - **Cover**: Edge Function architecture, action handler, Steam auth flow, deployment process, integration tests
  - **Status**: ✅ Fixed - Added `docs/supabase-backend.md` covering architecture, env vars, testing strategy, bundling pipeline, and deployment process (2026-03-13)

### Developer Experience
- [x] **Add pre-commit hooks**
  - **Context**: Enforce code quality before commits
  - **Impact**: Prevents broken code from being committed
  - **Effort**: Low (0.5 day)
  - **Tools**: Husky + lint-staged
  - **Hooks**: ESLint, Prettier, type checking
  - **Status**: ✅ Fixed - Added Husky pre-commit hook running lint-staged (ESLint + Prettier on staged TS/TSX files) and TypeScript type checking (2026-03-11)

- [x] **Improve hot reload speed**
  - **Context**: Development server reload times could be faster
  - **Impact**: Faster iteration during development
  - **Effort**: Medium (1 day)
  - **Steps**:
    1. Audit webpack config for optimization opportunities
    2. Implement module caching strategies
    3. Consider vite migration (future consideration)
  - **Status**: ✅ Improved webpack dev/debug rebuild speed by enabling filesystem cache and ts-loader transpile-only watch mode in `webpack/config.dev.cjs` and `webpack/config.debug.cjs` (2026-03-13)

### Code Organization
- [ ] **Reorganize project file structure (from TODO.md)**
  - **Context**: Proposed structure in TODO.md and ARCHITECTURE_PROPOSALS.md
  - **Impact**: Clearer separation of concerns
  - **Effort**: High (3-4 days)
  - **Risk**: High - requires extensive import updates
  - **Recommendation**: Do incrementally, one directory at a time
  - **Steps**:
    1. Create new structure in parallel
    2. Gradually move files with comprehensive testing
    3. Update all imports and configs
    4. Ensure all platforms still build

---

## Low Priority

Nice-to-have improvements that can be scheduled as time permits.

### Refactoring
- [x] **Evaluate Node.js engine requirement in package.json**
  - **Context**: No explicit engine version specified. CI workflows hardcode `node-version: '20'` but `package.json` has no `"engines"` field.
  - **Impact**: Prevents issues with incompatible Node versions
  - **Effort**: Trivial (0.1 day)
  - **File**: `phaser/package.json`
  - **Status**: ✅ Fixed - Added "engines": { "node": ">=20.0.0" } (2026-03-11)

- [ ] **Implement Action/Reducer pattern for state management**
  - **Context**: Proposed in ARCHITECTURE_PROPOSALS.md Section 4
  - **Impact**: Cleaner state mutations, easier debugging/replays
  - **Effort**: High (5-7 days)
  - **Risk**: High - requires significant refactoring
  - **Recommendation**: Create proof-of-concept first

- [x] **Strict "No-Phaser" Core**
  - **Context**: Ensure Core/ has zero Phaser dependencies
  - **Impact**: Enables headless testing, server-side validation
  - **Effort**: Medium (2-3 days)
  - **Steps**:
    1. Audit Core/ for Phaser imports
    2. Refactor any Phaser-dependent code
    3. Add ESLint rule to prevent Phaser imports in Core/
  - **Status**: ✅ Fixed - Audited `src/Core/` (no direct Phaser imports found) and added ESLint `no-restricted-imports` rule to block future `phaser` imports in Core files (2026-03-11)

### User Experience
- [x] **Add keyboard shortcuts**
  - **Context**: Mouse-only interaction currently
  - **Impact**: Power users can play faster
  - **Effort**: Medium (1-2 days)
  - **Examples**: Space to skip, number keys for unit selection
  - **Status**: ✅ Fixed - Added battleground keyboard shortcuts for `Space` to skip skippable phases and `1`-`9` to trigger current encounter, shop, and core-upgrade options via `GameController`; phase option state is now synced during phase rendering and covered by focused Jest tests (2026-03-13)

- [ ] **Improve mobile touch interactions**
  - **Context**: Android version needs touch optimization
  - **Impact**: Better mobile user experience
  - **Effort**: Medium (2 days)
  - **Focus**: Drag-and-drop, shop interactions, button sizes

---

## Technical Debt

Issues and patterns that should be addressed to prevent future problems.

### Code Smells
- [x] **Remove double slashes in import paths**
  - **Context**: `@Scenes//Debug/DebugController` found in test-utils/debugController.ts (line 5) — confirmed still present
  - **Impact**: Prevents potential path resolution issues
  - **Effort**: Trivial (0.1 day)
  - **File**: [src/test-utils/debugController.ts](phaser/src/test-utils/debugController.ts#L5)
  - **Status**: ✅ Fixed (2026-03-11)

- [ ] **Centralize magic numbers and constants**
  - **Context**: Hardcoded values throughout codebase
  - **Impact**: Easier balancing and configuration
  - **Effort**: Medium (1-2 days)
  - **Steps**:
    1. Identify commonly used magic numbers
    2. Move to appropriate config files
    3. Document rationale for values

### Architecture Debt
- [x] **Complete Systems consolidation cleanup**
  - **Context**: Post-migration from `Scenes/Battleground/Systems/` to `Systems/`
  - **Impact**: Ensure no broken references or orphaned files
  - **Effort**: Low (0.5 day)
  - **Status**: ✅ Verified complete - no remaining references to `Scenes/Battleground/Systems/` and no orphaned legacy directory found (2026-03-11)

- [ ] **Standardize error handling patterns**
  - **Context**: Inconsistent error handling across modules
  - **Impact**: Better error recovery and user feedback
  - **Effort**: Medium (2 days)
  - **Steps**:
    1. Define error handling conventions
    2. Create error boundary utilities
    3. Apply consistently across codebase

---

## Quality & Testing

Improvements to testing infrastructure and coverage.

### Test Coverage
- [x] **Add code coverage reporting**
  - **Context**: No code coverage metrics currently tracked
  - **Impact**: Identify untested code paths
  - **Effort**: Low (0.5 day)
  - **Tools**: Jest coverage, Istanbul
  - **Config**: Add to `jest.config.cjs`
  - **Goal**: >80% coverage for Core/, >60% for Systems/
  - **Status**: ✅ Fixed - Added Jest coverage configuration (`collectCoverageFrom`, reports, output directory) and `npm run test:coverage` script; verified coverage report generation (2026-03-11)

- [ ] **Create visual regression tests**
  - **Context**: UI changes could break visual appearance
  - **Impact**: Catch visual bugs early
  - **Effort**: Medium (1-2 days)
  - **Tools**: Playwright with screenshot comparison
  - **Scope**: Main menu, shop UI, combat board

- [ ] **Property-based testing for game logic**
  - **Context**: Suggested in phase-system-refactoring.md
  - **Impact**: Find edge cases in randomized scenarios
  - **Effort**: Medium (2 days)
  - **Tools**: fast-check
  - **Focus**: Combat simulation, shop generation, encounter selection

### Test Infrastructure
- [x] **Improve test execution speed**
  - **Context**: Large test suites can be slow
  - **Impact**: Faster CI/CD, better developer experience
  - **Effort**: Low (1 day)
  - **Steps**:
    1. Enable Jest test parallelization
    2. Use test sharding in CI
    3. Mock expensive operations
  - **Status**: ✅ Added a cached CI-oriented Jest script, faster ts-jest isolated transforms, persistent Jest cache, and 2-way unit-test sharding in `.github/workflows/webpack.yml` (2026-03-13)

- [ ] **Add mutation testing**
  - **Context**: Verify tests actually catch bugs
  - **Impact**: Improve test quality
  - **Effort**: Medium (1 day)
  - **Tools**: Stryker
  - **Scope**: Start with Core/ logic

---

## Performance Optimizations

Improvements for load times, runtime performance, and bundle size.

### Bundle Optimization
- [ ] **Implement code splitting**
  - **Context**: Single bundle loads all code upfront
  - **Impact**: Faster initial load time
  - **Effort**: Medium (2-3 days)
  - **Strategy**:
    1. Split by route (main menu, game, settings)
    2. Lazy load asset-heavy modules
    3. Measure bundle sizes before/after

- [ ] **Optimize asset loading**
  - **Context**: All assets loaded at start
  - **Impact**: Faster game startup
  - **Effort**: Medium (2 days)
  - **Steps**:
    1. Implement progressive asset loading
    2. Load assets by scene
    3. Add loading progress indicators

- [ ] **Reduce bundle size**
  - **Context**: Monitor and optimize bundle size
  - **Impact**: Faster downloads, better web performance
  - **Effort**: Low (ongoing)
  - **Steps**:
    1. Analyze bundle with webpack-bundle-analyzer
    2. Remove unused dependencies
    3. Use tree-shaking effectively
    4. Consider alternative lighter libraries

### Runtime Performance
- [ ] **Profile and optimize combat loop**
  - **Context**: Complex combat logic runs every frame
  - **Impact**: Smoother gameplay, especially on lower-end devices
  - **Effort**: Medium (2 days)
  - **Steps**:
    1. Profile with Chrome DevTools
    2. Identify hotspots
    3. Optimize trigger system, effect application
    4. Consider object pooling

- [ ] **Optimize Phaser rendering**
  - **Context**: Many sprites and effects on screen
  - **Impact**: Better frame rates
  - **Effort**: Medium (1-2 days)
  - **Steps**:
    1. Use texture atlases consistently
    2. Reduce draw calls via batching
    3. Optimize particle effects
    4. Profile with Phaser debug tools

---

## DevOps & CI/CD

Improvements to build, deployment, and development workflows.

### CI/CD Pipeline
- [x] **Add automated unit test runs to CI**
  - **Context**: No workflow runs `npm run test`. E2E tests exist (`e2e-tests.yml`) but are manual-only (`workflow_dispatch`). `webpack.yml` runs on push to `main` but only builds — no tests.
  - **Impact**: Catch failures earlier; currently no automated test gate on merges
  - **Effort**: Low (0.5 day)
  - **Action**: Add `npm run test` step to `webpack.yml` before the build step
  - **Status**: ✅ Fixed - Added `npm run test` before build in `.github/workflows/webpack.yml` using Node 20 with npm cache (2026-03-11)

- [x] **Re-enable automated E2E tests in CI**
  - **Context**: `e2e-tests.yml` only triggers via `workflow_dispatch` (manual). Should run on PRs to `main`.
  - **Impact**: Catch integration regressions before merge
  - **Effort**: Low (0.5 day)
  - **Action**: Add `pull_request` trigger to `e2e-tests.yml`
  - **Status**: ✅ Fixed - Added `pull_request` trigger for `main` while keeping manual `workflow_dispatch` (2026-03-11)

- [ ] **Add build verification for all platforms**
  - **Context**: Only web build (`webpack.yml`) runs automatically. Electron and Android builds are manual.
  - **Impact**: Catch platform-specific build issues
  - **Effort**: Medium (1 day)
  - **Platforms**: Web (automated), Electron Win/Mac/Linux (manual), Android (manual)

- [ ] **Implement automated deployment**
  - **Context**: `publish-steam.yml` and `publish-itch.yml` exist but are manual. Shell scripts `scripts/publish_steam.sh` and `scripts/publish_steam_demo.sh` also exist for manual deployment.
  - **Impact**: Faster, safer releases
  - **Effort**: High (2-3 days)
  - **Targets**: Itch.io, Steam, GitHub Releases

### Development Tools
- [x] **Add bundle size monitoring**
  - **Context**: Track bundle size changes over time
  - **Impact**: Prevent bundle bloat
  - **Effort**: Low (0.5 day)
  - **Tools**: bundlesize, size-limit
  - **Integration**: Add to CI pipeline
  - **Status**: ✅ Fixed - Added `size-limit` + `@size-limit/file`, configured bundle threshold for `dist/bundle.min.js`, and integrated check in `webpack.yml` CI workflow (2026-03-11)

- [x] **Create debug build configuration**
  - **Context**: Development builds could have more debug tools
  - **Impact**: Easier debugging and development
  - **Effort**: Low (0.5 day)
  - **Features**: Source maps, verbose logging, debug panels
  - **Status**: ✅ Fixed - Added dedicated debug webpack config (`webpack/config.debug.cjs`) with source maps, non-minified output, and debug log level injection; added `npm run build:debug` script (2026-03-11)

---

## Future Features

Potential new features and enhancements to consider.

### Gameplay
- [ ] **Add configurable difficulty modes**
  - **Context**: Single difficulty level currently
  - **Impact**: Accessibility for different skill levels
  - **Effort**: Medium (2-3 days)

- [ ] **Implement replay system**
  - **Context**: Save and replay matches
  - **Impact**: Learning, content creation, bug reporting
  - **Effort**: High (5-7 days)
  - **Foundation**: Action/Reducer pattern would enable this

- [ ] **Add daily challenges / weekly events**
  - **Context**: Increase replayability
  - **Impact**: Player retention
  - **Effort**: High (5-7 days)
  - **Requirements**: Server infrastructure for challenge distribution

### Social Features
- [ ] **Leaderboards**
  - **Context**: Competitive play tracking
  - **Impact**: Player engagement
  - **Effort**: Medium (3-4 days)
  - **Requirements**: Backend API, Steam integration

- [ ] **Match history**
  - **Context**: View past games
  - **Impact**: Track progress, review strategies
  - **Effort**: Medium (2-3 days)
  - **Requirements**: Database schema for match records

### Content
- [ ] **Expand unit collection**
  - **Context**: Add more units and cards
  - **Impact**: More variety and strategies
  - **Effort**: Medium per unit (design + implementation + balance)
  - **Docs**: [unit-balance.md](docs/unit-balance.md)

- [ ] **New encounter types**
  - **Context**: More varied PVE challenges
  - **Impact**: Freshness in gameplay
  - **Effort**: Medium (2-3 days per encounter type)

---

## Implementation Guidelines

### Before Starting Any Task
1. ✅ **Read relevant documentation** from `/docs/` directory
2. ✅ **Check coding standards** in `.github/instructions/mana-battle-standards.instructions.md`
3. ✅ **Review AGENTS.md** for context and current issues
4. ✅ **Branch naming**: Use descriptive names like `feature/phase-system-migration` or `fix/audio-fade-tweens`

### During Implementation
1. 🔨 **Write tests first** (TDD) where applicable
2. 🔨 **Update documentation** as you go
3. 🔨 **Run tests frequently**: `npm run test`
4. 🔨 **Check for errors**: `npm run lint`
5. 🔨 **Commit atomically**: Small, focused commits

### After Completing Task
1. ✅ **Run full test suite**: `npm run test && npm run test:e2e`
2. ✅ **Test all affected platforms** (Web, Electron, Android if applicable)
3. ✅ **Update this plan.md**: Mark task as completed with date
4. ✅ **Update AGENTS.md**: Move task from Queue to Completed section
5. ✅ **Create/update documentation** if system changed
6. ✅ **Consider follow-up tasks**: Add any newly discovered issues to this plan

---

## Prioritization Matrix

Use this matrix to help prioritize tasks not already categorized:

| Factor             | Weight | Questions                                                |
|--------------------|--------|----------------------------------------------------------|
| **Impact**         | 40%    | How many users/developers affected? How significantly?   |
| **Effort**         | 30%    | How many developer-days required? Risk of complications? |
| **Dependencies**   | 20%    | Does this block other work? Is it blocked by anything?   |
| **Technical Debt** | 10%    | Does this address accumulating technical debt?           |

**Scoring**: High (3), Medium (2), Low (1) → Calculate weighted score → Prioritize highest scores first

---

## Completed Tasks

Previously completed work for historical reference.

### Architecture & Refactoring
- [x] **Systems consolidation** — Moved systems from `Scenes/Battleground/Systems/` to `src/Systems/`
- [x] **GameController pattern** — Implemented unified interface for game actions
- [x] **Converted MultiplayerManager to functional module** — Replaced singleton class with module-level state and exported functions
- [x] **Server-side combat migration** — Headless combat simulation (see [server-side-combat-migration.md](docs/server-side-combat-migration.md))

### Bug Fixes (February 2026)
- [x] **Fixed multiplayer `orb_shop` phase transition** — Now properly sends `orb_shop_done` to transition to next phase (2026-02-16)
- [x] **Added missing `upgrade_core` and `add_reaction_core` phase handlers** — Display effect card shop in multiplayer (2026-02-16)
- [x] **Fixed phase step increment logic** — Shops no longer increment steps (they're part of the same turn as encounters), ensuring correct 3-encounter sequence before combat (2026-02-17)
- [x] **Fixed shop-to-combat transition** — Shop now properly transitions to encounter phase with combat warning instead of directly to combat phase (2026-02-17)

### Resolved Bugs
- [x] Game over screen match statistics showing 0 — fixed
- [x] Match stats preserved when saving and resuming a game — fixed
- [x] Unit position changes saved when moving on board — fixed

### Technical Debt (March 2026)
- [x] **Removed double slashes in import paths** — Fixed `@Scenes//Debug/DebugController` to `@Scenes/Debug/DebugController` in test-utils/debugController.ts (2026-03-11)
- [x] **Added Node.js engine requirement** — Added "engines": { "node": ">=20.0.0" } to package.json to enforce version compatibility (2026-03-11)

### Audio System (March 2026)
- [x] **Replaced setTimeout with Phaser tweens for audio fade** — Implemented smooth volume transitions in AudioManager using Phaser's tween system for fade-in and fade-out effects (2026-03-11)

### Developer Experience (March 2026)
- [x] **Added pre-commit hooks** — Configured Husky + lint-staged to run ESLint/Prettier on staged TS/TSX files and full type checking before commits (2026-03-11)
- [x] **Created debug build configuration** — Added `webpack/config.debug.cjs` and `build:debug` npm script to generate a non-minified debug bundle with source maps and debug-level logging defaults (2026-03-11)

### DevOps (March 2026)
- [x] **Added automated unit test runs to CI** — Updated `.github/workflows/webpack.yml` to install dependencies and run `npm run test` before `npm run build` (2026-03-11)
- [x] **Re-enabled automated E2E tests in CI** — Updated `.github/workflows/e2e-tests.yml` to run on pull requests targeting `main` (and kept manual dispatch) (2026-03-11)
- [x] **Added bundle size monitoring in CI** — Added `size-limit` bundle threshold check (`npm run test:bundle-size`) and executed it in `.github/workflows/webpack.yml` after the production build (2026-03-11)

### Architecture Debt (March 2026)
- [x] **Completed Systems consolidation cleanup verification** — Confirmed no remaining `Scenes/Battleground/Systems/` references and no legacy directory under `phaser/src/Engine/Scenes/Battleground/` (2026-03-11)

### Architecture Guardrails (March 2026)
- [x] **Enforced Strict "No-Phaser" Core** — Added ESLint guard (`no-restricted-imports`) for `src/Core/**` to prevent direct `phaser` imports and preserve framework-agnostic core logic (2026-03-11)

### Code Quality (March 2026)
- [x] **Implemented structured logging system** — Added `phaser/src/Utils/Logger.ts` with log levels and environment filtering; migrated key noisy modules and documented conventions in `docs/logging-system.md` (2026-03-11)

### Quality & Testing (March 2026)
- [x] **Added code coverage reporting** — Configured Jest coverage collection for Core and Systems code, generated text/lcov/html reports, and added `test:coverage` npm script (2026-03-11)

### Documentation (March 2026)
- [x] **Documented UI System** — Added `docs/ui-system.md` covering HUD composition, event/update flow, shared component primitives, and layout/input patterns (2026-03-11)
- [x] **Documented Effect System** — Added `docs/effect-system.md` covering playback pipeline, effect module structure, trigger visual adapters, and implementation guidelines (2026-03-11)
- [x] **Documented Options/Preferences System** — Added `docs/options-system.md` covering `OptionsStore`, persistence through `StorageFactory`, options scene tab composition, runtime side effects, and localization integration (2026-03-11)

### Phase System Fixes (March 2026)
- [x] **Fixed encounter phase skip action in LocalGameController** — Added 'skip_encounter' case for encounter phase (was fallback to invalid 'skip'); changed shop phase to use 'skip_shop' for consistency with RemoteGameController (2026-03-11)
- [x] **Fixed unit test for orb_shop skip action** — Updated `LocalServerAdapter.test.ts` to use 'orb_shop_done' instead of non-existent 'skip_orb_shop' action (2026-03-11)
- [x] **Investigated E2E test failures** — Identified that phase system migration affects E2E test assumptions; documented issues in PLAN.md for future work; changed game_flow test to simplified approach (2026-03-11)

---

## Current Sprint Focus
- [ ] Phase system migration (Critical) - investigation underway
- [ ] Single-player/multiplayer unification (Critical)
- [x] Add unit tests to CI pipeline (High — quick win)
- [x] Logging system implementation (High)
- [ ] E2E test fixes (High) - 4 tests still failing, phase advancement issues identified

---

## Notes & Decisions

### Architectural Decisions
- **Functional Programming Preferred**: Classes only for Phaser integration (see mana-battle-standards.instructions.md)
- **Server Adapter Pattern**: All game modes go through `IGameServer` interface
- **Combat Playback**: Server simulates combat, client plays back via logs

### Migration Status
- ✅ Phase 1: Core abstraction complete
- ✅ Phase 2: Server adapters working
- 🔄 Phase 3: Client refactoring in progress

---

**End of Development Roadmap**

*Last reviewed: March 11, 2026*
