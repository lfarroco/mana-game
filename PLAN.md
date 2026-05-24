# Mana Battle - Development Roadmap

**Last Updated**: March 27, 2026

This document outlines the development priorities and planned improvements for Mana Battle. Tasks are organized by priority and category to guide development efforts systematically.

Completed-task history is archived in [AGENTS_ARCHIVE.md](AGENTS_ARCHIVE.md) to keep this roadmap focused on active and upcoming work.

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
11. [Current Sprint Focus](#current-sprint-focus)

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
- [x] **Complete migration to `Core/PhaseSystem/` architecture**
  - **Context**: New handler-based system exists but legacy `PhaseManager.ts` still runs main loop
  - **Impact**: Enables consistent phase handling across single/multiplayer modes
  - **Effort**: High (3-5 days)
  - **Status**: ✅ Completed (2026-03-24) - All phase handlers tested; legacy `renderPhase()` fallback removed from `PhaseManager.ts`; `startPhase()` now routes both single-player and multiplayer through `handleMultiplayerPhase`; 38 new unit tests added for all 7 phase handlers; `CombatPhaseHandler` comment updated to clarify `victory` vs `combat_done` semantics; 287 tests passing.
  - **Docs**: [phase-system-refactoring.md](docs/phase-system-refactoring.md)
  - **Steps**:
    1. ✅ Audit which phases still use legacy `PhaseManager.ts`
    2. ✅ Create comprehensive tests for all phase handlers (`handlers/PhaseHandlers.test.ts`, 38 tests)
    3. ✅ Migrate remaining phases to new handler architecture (already complete via `SessionTransitions.ts`)
    4. ✅ Remove legacy `renderPhase()` and unused imports from `PhaseManager.ts`
    5. ✅ Update documentation

### Single-Player/Multiplayer Unification
- [x] **Use multiplayer handler in single-player mode**
  - **Context**: Both modes should use `GameServer` interface consistently
  - **Impact**: Reduces code duplication, ensures parity between modes
  - **Effort**: Medium (2-3 days)
  - **Status**: ✅ Completed (2026-03-23) - Single-player now routes through the shared multiplayer phase handler via local transport; added parity-focused adapter tests and cross-mode handler tests. Legacy fallback/deletion cleanup remains tracked in Phase 4.
  - **Docs**: [single-multiplayer-unification.md](docs/single-multiplayer-unification.md)
  - **Steps**:
    1. ✅ Ensure `LocalServerAdapter` has complete feature parity
    2. ✅ Update single-player initialization to use server adapter
    3. ✅ Remove direct game logic calls from single-player UI (primary path)
    4. ✅ Comprehensive testing of both modes (adapter + shared handler test coverage)
    5. ✅ Update Phase 3 status in unification doc

### Pure Logic Migration
- [x] **Make game logic pure (remove Phaser-mock dependencies)**
  - **Context**: Deferred replay verification is implemented, but server replay currently depends on a bundled `_shared.js` generated from `Core/GameLogic.ts` that still needs global shims (`window`, `localStorage`, `Phaser`) in `scripts/bundle-edge.ts`.
  - **Status**: ✅ Completed (2026-03-23) - All acceptance criteria met. Core has zero runtime Phaser dependencies (type-only imports verified). `replay-commit/_shared.js` confirmed free of scene/UI modules. Determinism tests passing. Purity boundary documented in [purity-boundary.md](docs/purity-boundary.md).
  - **Effort**: High (4-6 days) - Completed incrementally across 5 sessions
  - **Related**: Deferred replay submission in Supabase Edge Functions
  - **Completed steps**:
   1. ✅ **Define pure combat contracts in Core** - `CombatEffects`, `CombatLogEntry`, `ForceStatsState`, `BlackHoleState` all in `src/Core/Combat/` with type-only Phaser imports
   2. ✅ **Extract replay-critical combat runtime from scene paths** - `ServerCombatEffects`, `RunCombatCore` moved to Core; scene-only code isolated in Engine layer
   3. ✅ **Rewire `GameLogic` to pure modules only** - GameLogic re-exports only pure functions; no imports from Engine/Scenes or Systems
   4. ✅ **Harden Edge bundle boundaries** - Bundle regenerated; verified no AudioManager/steamworks/scene refs; bundle size stable at 369KB
   5. ✅ **Add determinism + parity gates** - Replay tests passing: identical manifests produce identical snapshots (ReplayManifest.test.ts)
   6. ✅ **Document purity boundary and ownership** - New [purity-boundary.md](docs/purity-boundary.md) defines allowed/forbidden imports, verification checklist
  - **Acceptance criteria (all passing)**:
   1. ✅ `replay-commit/_shared.js` no longer references `window.steamworks`, `AudioManager`, or scene/UI modules
   2. ✅ Replay path executes in Edge without Phaser/browser global mocks for core logic (zero runtime Phaser usage verified)
   3. ✅ Determinism tests pass for encounter/shop/combat and final snapshot parity
   4. ✅ `transitionToNextState` + combat simulation run headless in unit tests without Phaser mocks
  - **Key Findings**:
   - Core folder uses type-only Phaser imports; no runtime Phaser API calls
   - ForceStatsState and BlackHoleState are interface placeholders for Engine layer to fill in; Core initializes them as empty objects
   - Type annotations satisfying TypeScript without violating purity
   - 249 tests passing; replay determinism verified

---

## High Priority

These tasks significantly improve code quality, maintainability, and user experience.

### Code Quality
- [ ] **Remove unused code and dead code paths**
  - **Context**: Post-refactoring cleanup needed
  - **Impact**: Smaller bundle size, easier maintenance
  - **Effort**: Medium (1-2 days)
  - **Status**: 🚧 In progress (2026-03-29) - Ran ts-prune; deleted TestShader.ts, TestOrbShader.ts, TriggerSystem/examples.ts, and orphaned `src/Systems/MatchResultSystem.ts`; removed TURN_DURATION from config.ts and unused randomBetween/shuffle wrappers from utils.ts; removed duplicate `initializeVisualizer()` startup call in `BattlegroundScene`. Second pass (2026-03-29): deleted orphaned `SavedGame.ts`, `Vec2.ts`, `hpColor.ts`, `colors.ts`; removed `forceCheckUnlocks`, `finalizeRound`, `PhaseHandlerFactory`, `MagicOrbFactory`, `updateUnitPower`, `updateUnitCritical`, and unused `colorUtils` functions (vector3ToHex, hexToVector4, lerpHexColors, ShaderColors). Many remaining ts-prune results are false positives (barrel index exports, phaser.io.ts, MockPhaser.ts). Remaining real candidates need careful manual review.
  - **Steps**:
    1. ~~Run dead code detection tools (e.g., ts-prune)~~ ✅
    2. ~~Remove unused imports and functions~~ ✅
    3. ~~Check for orphaned files post-Systems migration~~ ✅

- [x] **Escalate ESLint warnings to errors**
  - **Context**: `no-explicit-any`, `no-unused-vars`, `no-console`, and `prefer-const` are all set to `warn` in `eslint.config.js`, allowing problematic code to be committed
  - **Impact**: Enforces type safety, immutability, and logging discipline
  - **Effort**: Low (0.5 day)
  - **Status**: ✅ Completed (2026-03-20) - All four rules now at `error`. Fixed 133 `no-explicit-any` violations across 17 test/utility files (replaced with proper types: `CombatEnvironment`, `CombatLogEntry`, `Force`, `State`, etc.). `no-console` remains `warn` in test files only (intentional exception).
  - **Remaining**: Evaluate `no-console` as `error` after implementing structured logging (test files intentionally excluded)

---

## Medium Priority

These tasks enhance developer experience and expand documentation.

### Game Balance
- [x] **Adjust unit encounter presentation and upgrade incentives**
  - **Context**: Encounter options and upgrade rewards should better support clear progression from bronze to gold.
  - **Impact**: Stronger progression clarity, better decision-making tension, and more meaningful upgrade planning.
  - **Effort**: Medium (1-2 days)
  - **Status**: ✅ Completed (2026-03-27) - Implemented encounter presentation updates, stronger upgrade incentives, and direct gold-unit cooldown tuning in unit data
  - **Changes Made**:
    1. ✅ **Gold shop now displays 1 unit** - Modified `generateShopOptions()` to return 1 option for gold_shop encounters instead of 3
    2. ✅ **Silver shop now displays 2 units** - Modified `generateShopOptions()` to return 2 options for silver_shop encounters instead of 3  
    3. ✅ **Increased upgrade bonuses** - Changed rank-up multiplier from 1.5x to 1.75x per rank level in both `RecruitmentActions.ts` and `OrbAndCoreUpgrades.ts`, creating stronger progression incentive:
       - Rank 1 (bronze): 100 hp, 100 power (baseline)
       - Rank 2 (silver): 175 hp, 175 power (1.75x)
       - Rank 3 (gold): 306 hp, 306 power (1.75x × 175)
       - Rank 4 (platinum): 535 hp, 535 power (1.75x × 306)
    4. ✅ **Kept cooldown values data-driven** - No encounter-specific cooldown penalty is applied in recruitment flow; recruitable gold units now have their slower timing tuned directly in unit definitions
  - **Testing**: All 460 tests pass (55 test suites); verified via ActionResolver, LocalServerAdapter, and full test suite
  - **Steps**:
    1. ✅ Make the gold unit encounter display a single unit.
    2. ✅ Make the silver unit encounter display two units to choose from.
    3. ✅ Increase upgrade bonuses to create stronger incentive for the bronze -> gold upgrade path.
    4. ✅ Explore adding a drawback to units that start at gold (implemented as direct cooldown tuning in gold unit data rather than recruitment logic).
    5. ⏸️ Explore making silver units more generic and formation-based so they function as wildcard units (deferred for future iteration based on playtesting feedback).

- [x] **Restrict type-specific unit stores to bronze units**
  - **Context**: Encounter stores like armory, healing tent, and other type-based recruiters currently filter by effect type across all ranks.
  - **Impact**: Keeps those stores focused on flexible early progression instead of bypassing the bronze -> silver -> gold path.
  - **Effort**: Low (0.5-1 day)
  - **Status**: ✅ Completed (2026-03-27) - Type-specific recruit stores now offer only bronze units, while silver/gold stores retain their dedicated rank restrictions.
  - **Testing**: Added `OptionGeneration.test.ts` coverage for all 10 type-specific stores plus silver/gold shop rank guards.
  - **Steps**:
    1. ✅ Update type-based shop filtering so damage/heal/shield/regen/poison/haste/slow/charge/power/crit stores only offer rank 1 units.
    2. ✅ Add or update tests covering store rank restrictions.
    3. ⏸️ Re-evaluate encounter descriptions if the presentation needs to clarify bronze-only recruitment.

### Input Support
- [ ] **Add keyboard and controller support across menus and battleground flows**
  - **Context**: Input is currently pointer-first, with limited keyboard shortcuts in battleground and a few scene-specific key listeners. Controller support needs a shared action/focus model instead of more direct listeners.
  - **Impact**: Improves accessibility, desktop usability, Steam Deck/controller compatibility, and overall UX parity across platforms.
  - **Effort**: High (4-6 days)
  - **Risk**: Medium - most risk is in focus management and board interaction, not button binding.
  - **Recommendation**: Deliver in phases, shipping keyboard-first on the shared input layer before adding controller polling.
  - **Docs**: [ui-system.md](docs/ui-system.md), [options-system.md](docs/options-system.md), [battle-system.md](docs/battle-system.md)
  - **Steps**:
    1. Define semantic input actions (`navigate`, `confirm`, `cancel`, `pause`, `skip`, `show_details`) and route keyboard/controller through the same action resolver.
    2. Replace scene-local raw key handlers with a shared input router per scene/context (title, options, battleground, modal/result screens).
    3. Add a focus manager for UI buttons, shop options, and modal actions, including visible focused-state styling.
    4. Add battleground board navigation with a cursor/select-confirm flow that reuses existing move/swap command paths instead of emulating drag-and-drop.
    5. Add Phaser gamepad support with deadzone and repeat-rate handling for D-pad/left stick plus confirm/cancel/menu button mapping.
    6. Extend options to support input-related settings and show on-screen button/key hints where helpful.
    7. Add unit tests for action resolution/focus routing and E2E coverage for title, shop, and board movement flows.

### Code Organization
- [ ] **Reorganize project file structure (from TODO.md)**
  - **Impact**: Clearer separation of concerns
  - **Effort**: High (3-4 days)
  - **Risk**: High - requires extensive import updates
  - **Recommendation**: Do incrementally, one directory at a time
  - **Steps**:
    1. Create new structure in parallel
    2. Gradually move files with comprehensive testing
    4. Ensure all platforms still build

---

## Low Priority

Nice-to-have improvements that can be scheduled as time permits.

- [ ] **Implement Action/Reducer pattern for state management**
  - **Context**: Proposed in ARCHITECTURE_PROPOSALS.md Section 4
  - **Impact**: Cleaner state mutations, easier debugging/replays
  - **Effort**: High (5-7 days)
  - **Risk**: High - requires significant refactoring
  - **Recommendation**: Create proof-of-concept first

- [ ] **Improve mobile touch interactions**
  - **Context**: Android version needs touch optimization
  - **Impact**: Better mobile user experience
  - **Effort**: Medium (2 days)
  - **Focus**: Drag-and-drop, shop interactions, button sizes


## Technical Debt

Issues and patterns that should be addressed to prevent future problems.

### Code Smells
- [ ] **Centralize magic numbers and constants**
  - **Impact**: Easier balancing and configuration
  - **Effort**: Medium (1-2 days)
  - **Steps**:
    1. Identify commonly used magic numbers
    2. Move to appropriate config files
    3. Document rationale for values

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
### Test Infrastructure
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

### Supabase Edge Function Performance
- [x] **Reduce auth latency in `action` endpoint**
  - **Context**: `auth.getUser()` adds a network round-trip on every action request
  - **Impact**: Lower per-action latency and less auth service load
  - **Effort**: Medium (1-2 days)
  - **Status**: Completed (2026-03-15) - `action` now verifies JWTs locally with `JWT_SECRET` and derives `playerId` from claims.
  - **Steps**:
    1. Verify JWT locally in Edge Function runtime
    2. Derive `playerId` from verified claims
    3. Keep authorization checks server-authoritative

- [x] **Add short-lived per-player session cache (L1)**
  - **Context**: Session read happens on almost every action
  - **Impact**: Fewer repeated reads during bursty gameplay
  - **Effort**: Medium (1 day)
  - **Guardrails**: 30-120s TTL, write-through updates, no long-lived authoritative state
  - **Status**: Completed (2026-03-15) - Added per-player warm-isolate cache with default 60s TTL (`SESSION_CACHE_TTL_MS`, clamped 30-120s), DB fallback on miss, and write-through refresh on successful writes.
  - **Steps**:
    1. Cache by `playerId` in warm isolate memory
    2. Invalidate/refresh cache after every successful write
    3. Fall back to DB on cache miss or stale entry
    4. Tune default to 60s for turn-based pacing

- [ ] **Add deferred end-of-run submission with deterministic server replay**
  - **Context**: The current `action` endpoint still pays auth/read/write cost on nearly every player action. The game already centralizes turn resolution in shared pure logic (`GameLogic`) and advances `session.seed` deterministically from action order.
  - **Impact**: Removes gameplay lag for PVE runs, reduces backend traffic from O(actions) writes per run to O(1) final submission, and preserves server authority by replaying the run before accepting it.
  - **Effort**: High (4-6 days)
  - **Feasibility**: High for single-player/PVE runs. Not a fit for real-time or adversarial multiplayer because the server no longer observes intermediate state in real time.
  - **Prerequisites / Guardrails**:
    1. Make the initial run seed explicit and authoritative. `createInitialSession()` currently generates it with `Math.random()`, so replay submission needs a server-issued or signed initial seed instead of an implicit local one.
    2. Capture the full ordered action stream, including `update_team` board-move events. The current live endpoint handles `update_team` outside `action_log`, and persisted logs are trimmed to 100 entries.
    3. Compare against a canonical normalized final snapshot or hash derived on the server, not client-reported win/loss values alone.
    4. Keep the existing per-action path behind a feature flag until browser and Edge replay results are proven identical.
  - **Steps**:
    1. Introduce a run manifest schema for deferred submission: `selectedCrystalId`, `initialSeed`, client build/version, and an ordered list of action envelopes `{ actionId, payload, sequence }`.
    2. Plumb explicit seed selection through crystal selection, `GameLogic.createInitialSession`, local session creation, and the Supabase start/commit flow so local and server runs begin from the same seed.
    3. Add a local action queue/persistence layer next to `SessionManager` so single-player runs can be played entirely locally and survive refresh/crash until submitted.
    4. Implement a dedicated Supabase replay-commit path that reconstructs a fresh session and replays every action via `GameLogic.transitionToNextState`, including validated `update_team` actions.
    5. Define a canonical comparison contract for acceptance: phase, round, step, wins/losses, normalized team state, seed, and any server-owned rewards/stats derived from replay.
    6. Make completion writes transactional and idempotent so duplicate submissions for the same run return a stable response instead of duplicating rewards or rating changes.
    7. Add golden determinism tests that run the same manifest through browser-local logic and Edge-bundled logic and assert identical encounter options, combat logs/outcomes, and final snapshots.
    8. Roll out behind a flag for PVE only, instrument reject reasons, payload sizes, and replay duration, then remove per-action writes for those runs after validation.

- [ ] **Serialize in-flight actions per player**
  - **Context**: Retries/double-submits can cause duplicate work and contention
  - **Impact**: Better correctness and lower tail latency under load
  - **Effort**: Medium (1 day)
  - **Steps**:
    1. Add per-player in-flight lock or queue
    2. Enforce idempotency for retried action IDs
    3. Return stable response for duplicate requests

- [ ] **Optional L2 distributed cache for burst traffic**
  - **Context**: L1 cache does not survive cold starts or cross-instance routing
  - **Impact**: Better p95/p99 when concurrency increases
  - **Effort**: Medium (1-2 days)
  - **Recommendation**: For turn-based sessions, default to 5m TTL with strict invalidation on write
  - **Use Cases**:
    1. Session snapshots for turn flow (default 5m TTL)
    2. Temporary Steam ticket verification cache for retry storms

- [ ] **Minimize write payload size and side-effects**
  - **Context**: Full-session JSON updates and side-effects increase request time
  - **Impact**: Lower DB CPU, network, and lock duration
  - **Effort**: Medium (1-2 days)
  - **Steps**:
    1. Update only changed fields where possible
    2. Cap/roll large action logs
    3. Move non-critical side-effects off critical response path when safe

- [ ] **Add request-level timing instrumentation**
  - **Context**: No clear segment-level visibility for edge latency
  - **Impact**: Faster performance debugging and safer optimization rollout
  - **Effort**: Low (0.5-1 day)
  - **Steps**:
    1. Emit `Server-Timing` for auth/read/logic/write/side-effects
    2. Track p50/p95 dashboards per endpoint (`action`, `auth-steam`)
    3. Set alerts for sustained tail-latency regressions

- [ ] **Align Edge Function execution with DB region**
  - **Context**: Region mismatch can dominate total latency
  - **Impact**: Immediate reduction in network time
  - **Effort**: Low (0.5 day)
  - **Steps**:
    1. Confirm Supabase project region and edge execution regions
    2. Pin/route stateful endpoints close to database region
    3. Re-measure p95 after regional alignment

---

## DevOps & CI/CD

Improvements to build, deployment, and development workflows.

### CI/CD Pipeline
- [ ] **Implement automated deployment**
  - **Context**: `publish-steam.yml` and `publish-itch.yml` exist but are manual. Shell scripts `scripts/publish_steam.sh` and `scripts/publish_steam_demo.sh` also exist for manual deployment.
  - **Impact**: Faster, safer releases
  - **Effort**: High (2-3 days)
  - **Targets**: Itch.io, Steam, GitHub Releases

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

## Current Sprint Focus
- [x] Phase system migration (Critical) - ✅ completed 2026-03-24
- [x] Single-player/multiplayer unification (Critical) - ✅ completed 2026-03-23

---

## Notes & Decisions

### Architectural Decisions
- **Functional Programming Preferred**: Classes only for Phaser integration (see mana-battle-standards.instructions.md)
- **Server Adapter Pattern**: All game modes go through `GameServer` interface
- **Combat Playback**: Server simulates combat, client plays back via logs

### Migration Status
- ✅ Phase 1: Core abstraction complete
- ✅ Phase 2: Server adapters working
- 🔄 Phase 3: Client refactoring in progress

---

**End of Development Roadmap**

*Last reviewed: March 15, 2026*
