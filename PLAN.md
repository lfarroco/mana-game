# Mana Battle - Development Roadmap

**Last Updated**: March 15, 2026

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

### Code Quality
- [ ] **Remove unused code and dead code paths**
  - **Context**: Post-refactoring cleanup needed
  - **Impact**: Smaller bundle size, easier maintenance
  - **Effort**: Medium (1-2 days)
  - **Steps**:
    1. Run dead code detection tools (e.g., ts-prune)
    2. Remove unused imports and functions
    3. Check for orphaned files post-Systems migration

- [ ] **Escalate ESLint warnings to errors**
  - **Context**: `no-explicit-any`, `no-unused-vars`, `no-console`, and `prefer-const` are all set to `warn` in `eslint.config.js`, allowing problematic code to be committed
  - **Impact**: Enforces type safety, immutability, and logging discipline
  - **Effort**: Low (0.5 day)
  - **Status**: 🚧 In progress (2026-03-13) - `prefer-const` and `@typescript-eslint/no-unused-vars` promoted to `error`; existing `prefer-const` and active `no-unused-vars` violations in source were fixed. Remaining rules (`no-explicit-any`, `no-console`) are still pending escalation.
    1. Change `no-explicit-any` to `error` (fix existing violations first)
    3. Evaluate `no-console` as `error` after implementing structured logging

---

## Medium Priority

These tasks enhance developer experience and expand documentation.

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
- [ ] Phase system migration (Critical) - investigation underway
- [ ] Single-player/multiplayer unification (Critical)

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

*Last reviewed: March 15, 2026*
