# Phase System Refactoring Project

## Executive Summary

The current phase system has become a major source of bugs due to scattered logic, inconsistent state management, and complex conditional chains. This document outlines a comprehensive refactoring plan to improve maintainability, reduce bugs, and make the system easier to understand and extend.

**Risk Level**: Medium (touches core game loop)
**Benefits**: Reduced bugs, easier testing, clearer code, faster feature development

---

## Current Problems

### 1. Scattered Phase Transition Logic
**Location**: `Core/GameLogic.ts:transitionToNextState()` (200+ lines)
- Deeply nested if/else chains make it hard to understand flow
- No clear separation between different transition types
- Difficult to test individual transitions in isolation
- Hard to add new phases or actions without breaking existing logic

### 2. Inconsistent State Persistence
**Locations**: `Core/LocalServerAdapter.ts`, `Core/GameLogic.ts`
- Some phases regenerate options on every fetch (was causing discard bug)
- No guarantee that stored options match the current phase
- Unclear ownership: who decides what options are available?

### 3. No Action Categorization
**Impact**: Every new action requires modifying core transition logic
- No distinction between phase-transitioning vs meta actions
- Hard to predict which actions will advance the phase
- Code must check action against all card IDs to determine if it's a purchase

### 4. Complex Step Counter
**Location**: Throughout `GameLogic.ts`
- Steps increment at different times for different phases
- Unclear relationship between step, phase, and round
- Comments contradicting code (e.g., "Step 4" vs actual step values)

### 5. Multiple Code Paths
**Locations**: `PhaseManager.ts`, `MultiplayerPhaseManager.ts`
- Three different rendering paths (legacy, single-player, multiplayer)
- Code duplication and subtle differences
- Bugs in one path don't necessarily exist in others

### 6. No Validation Layer
**Impact**: Invalid transitions can occur silently
- No validation that actions are valid for current phase
- No validation that phase transitions are legal
- Errors only discovered when UI breaks

### 7. Poor Testability
**Evidence**: Limited test coverage for phase transitions
- Hard to set up specific phase states
- Difficult to test edge cases
- Tests would need to mock too many dependencies

---

## Goals

### Primary Goals
1. **Reduce bugs** by eliminating ambiguous state transitions
2. **Improve maintainability** by organizing code into clear, testable units
3. **Enable extensibility** so new phases/actions are easy to add
4. **Maintain compatibility** with existing save games and multiplayer

### Non-Goals
- Changing gameplay mechanics or phase sequences
- Rewriting multiplayer architecture (except unification)
- Changing UI/rendering code (only transition logic)

---

## Proposed Architecture

### State Machine Pattern

```typescript
// Core abstraction
interface PhaseTransitionContext {
  session: SessionData;
  actionId: string;
  payload?: ActionPayload;
}

interface PhaseTransitionResult {
  nextPhase: PhaseType;
  nextOptions: PhaseOption[];
  stepIncrement?: number;
  roundIncrement?: number;
  specialData?: Record<string, any>; // e.g., combatState
}

interface PhaseHandler {
  readonly phase: PhaseType;
  readonly actionType: ActionType;
  
  canHandle(context: PhaseTransitionContext): boolean;
  transition(context: PhaseTransitionContext): PhaseTransitionResult;
  validateAction(context: PhaseTransitionContext): ValidationResult;
}

// Registry system
class PhaseTransitionRegistry {
  private handlers: PhaseHandler[] = [];
  
  register(handler: PhaseHandler): void;
  findHandler(context: PhaseTransitionContext): PhaseHandler | null;
  transition(context: PhaseTransitionContext): PhaseTransitionResult;
}
```

### Action Categories

```typescript
enum ActionType {
  PHASE_TRANSITION = 'phase_transition',  // Advances to next phase
  META_ACTION = 'meta_action',            // Stays in current phase
  SUB_PHASE = 'sub_phase',                // Stays in sub-phase
  PHASE_SKIP = 'phase_skip',              // Skips current phase
}

// Action registry
const ACTION_REGISTRY: Record<string, ActionMetadata> = {
  // Meta actions (don't change phase)
  'discard_unit': { type: ActionType.META_ACTION },
  'apply_orb': { type: ActionType.SUB_PHASE },
  
  // Phase transitions
  'skip_shop': { type: ActionType.PHASE_SKIP, fromPhase: 'shop' },
  'skip_encounter': { type: ActionType.PHASE_SKIP, fromPhase: 'encounter' },
  'combat_done': { type: ActionType.PHASE_TRANSITION, fromPhase: 'combat' },
  'combat_encounter': { type: ActionType.PHASE_TRANSITION, fromPhase: 'encounter', toPhase: 'combat' },
  
  // Card purchases (dynamic)
  // These will be matched by pattern instead of explicit registration
};
```

Dynamic card purchases should resolve through the existing CardCatalog so registry lookups stay authoritative even when card IDs are generated at runtime; prefer a helper like `resolveCardActionMetadata(cardId: string)` over ad-hoc pattern checks.

### Validation Layer

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

class PhaseValidator {
  validateTransition(
    from: PhaseType, 
    to: PhaseType, 
    session: SessionData
  ): ValidationResult;
  
  validateAction(
    phase: PhaseType, 
    actionId: string, 
    availableOptions: PhaseOption[]
  ): ValidationResult;
  
  validateSession(session: SessionData): ValidationResult;
  validateIncrements(previous: SessionData, result: PhaseTransitionResult): ValidationResult;
}
```

Add validators for deterministic seeds to ensure combat replays stay reproducible when transitioning between the old and new systems.

---

## Pre-Refactor Audit

- Document the current phase → step → round invariants and any implicit assumptions that tests rely on.
- Capture a golden dataset of at least 50 real game session logs (single-player and multiplayer) including action IDs, selected options, seeds, and resulting session diffs.
- Catalogue every action ID and card prefix in use today, noting how they are generated (static catalog, procedural, server-issued) to inform the action registry strategy.
- Map asynchronous or server-confirmed flows (e.g., combat resolution) so handlers account for deferred updates and error channels.
- Define the minimum session shape required by the UI layers to prevent regressions when LocalServerAdapter stops regenerating options.

## Implementation Steps

### Phase 1: Foundation

#### Step 1.1: Create Core Interfaces
**File**: `Core/PhaseSystem/types.ts`
- Define all interfaces listed in Proposed Architecture
- Add comprehensive JSDoc comments
- Create union types for all valid transitions

**Deliverable**: Type definitions with no implementation

#### Step 1.2: Create Action Registry
**File**: `Core/PhaseSystem/ActionRegistry.ts`
- Define ActionMetadata interface
- Create registry with all current actions categorized
- Add helper methods: `getActionType()`, `isValidForPhase()`, `isCardPurchase()`

**Deliverable**: Complete action registry with tests

#### Step 1.3: Create Phase Validator
**File**: `Core/PhaseSystem/PhaseValidator.ts`
- Implement basic validation rules
- Define legal phase transition matrix
- Add validation for common error cases
- Validate step/round increments and deterministic seed expectations
  - Ensure handlers persist action_log entries and next options in a consistent order so downstream helpers (e.g., generateShopOptions, combat replay pipelines) stay functional

**Deliverable**: Validator with unit tests

**Tests to Write**:
```typescript
describe('PhaseValidator', () => {
  it('allows valid transitions');
  it('rejects invalid transitions');
  it('validates action is in available options');
  it('validates session state consistency');
});
```

### Phase 2: Extract Phase Handlers

#### Step 2.1: Create Base Handler
**File**: `Core/PhaseSystem/BasePhaseHandler.ts`
- Abstract base class with common logic
- Implement seed generation
- Implement action logging
- Helper methods for option management

#### Step 2.2: Create Individual Handlers
**Files**: `Core/PhaseSystem/handlers/`
- `EncounterPhaseHandler.ts`
- `ShopPhaseHandler.ts`
- `CombatPhaseHandler.ts`
- `OrbShopPhaseHandler.ts`
- `UpgradeCorePhaseHandler.ts`
- `MetaActionHandler.ts` (for discard_unit, etc.)

**For each handler**:
1. Extract logic from `transitionToNextState()`
2. Add clear documentation
3. Write unit tests

**Example Implementation**:
```typescript
class ShopPhaseHandler extends BasePhaseHandler {
  readonly phase = 'shop';
  readonly actionType = ActionType.PHASE_TRANSITION;
  
  canHandle(context: PhaseTransitionContext): boolean {
    return context.session.phase === 'shop' && 
           (this.isCardPurchase(context.actionId) || 
            context.actionId === 'skip_shop');
  }
  
  transition(context: PhaseTransitionContext): PhaseTransitionResult {
    const { session } = context;
    
    // Determine next phase based on step
    const expectedPhase = this.getPhaseForTurn(
      session.round, 
      session.step
    );
    
    if (expectedPhase === 'encounter') {
      return {
        nextPhase: 'encounter',
        nextOptions: this.generateEncounterOptions(session),
        stepIncrement: 1
      };
    } else if (expectedPhase === 'combat') {
      return {
        nextPhase: 'combat',
        nextOptions: this.generateCombatOptions(session),
        stepIncrement: 1
      };
    }
    
    throw new Error('Unexpected phase sequence');
  }
}
```

### Phase 3: Create Registry System

#### Step 3.1: Implement Registry
**File**: `Core/PhaseSystem/PhaseTransitionRegistry.ts`
- Create registry class
- Implement handler registration
- Implement handler lookup logic
- Add fallback/error handling
- Detect and log when zero or more than one handler matches the same context, and fail fast so ambiguities never reach production.

#### Step 3.2: Wire Up Handlers
**File**: `Core/PhaseSystem/index.ts`
- Create singleton registry instance
- Register all handlers
- Export main transition function

```typescript
// Export this as the new main API
export function transitionPhase(
  session: SessionData,
  actionId: string,
  payload?: ActionPayload
): PhaseTransitionResult {
  const context = { session, actionId, payload };
  
  // Validate first
  const validation = validator.validateAction(
    session.phase,
    actionId,
    session.current_options?.options || []
  );
  
  if (!validation.valid) {
    throw new PhaseTransitionError(validation.errors);
  }
  
  // Find and execute handler
  return registry.transition(context);
}
```

### Phase 4: Migrate GameLogic

#### Step 4.1: Create Adapter Layer
**File**: `Core/GameLogic.ts` (modify)
- Keep existing `transitionToNextState()` signature
- Internally call new phase system
- Add feature flag for gradual rollout

```typescript
public static transitionToNextState(
  session: SessionData, 
  actionId: string, 
  payload?: ActionPayload
): { session: SessionData, combatResult?: { won: boolean } } {
  
  if (USE_NEW_PHASE_SYSTEM) {
    return this.transitionToNextState_v2(session, actionId, payload);
  }
  
  // Old implementation (keep temporarily)
  return this.transitionToNextState_v1(session, actionId, payload);
}

private static transitionToNextState_v2(...) {
  const result = transitionPhase(session, actionId, payload);
  
  // Convert to old format
  return {
    session: this.applyTransitionResult(session, result),
    combatResult: result.specialData?.combatResult
  };
}
```

#### Step 4.2: Parallel Testing
- Run both implementations in parallel (dev mode only)
- Log any differences in results
- Replay the golden dataset from the pre-refactor audit and diff serialized sessions (phase, step, options, team state, seeds) to catch regressions deterministically.
- Fix discrepancies in new implementation

#### Step 4.3: Gradual Rollout
1. Enable for new games only
2. Enable for single-player
3. Enable for multiplayer
4. Remove old code

### Phase 5: Unify Code Paths

#### Step 5.1: Update LocalServerAdapter
**File**: `Core/LocalServerAdapter.ts`
- Always use `current_options` from session
- Remove option regeneration logic
- Add validation before returning options

#### Step 5.2: Update MultiplayerPhaseManager
**File**: `Scenes/Battleground/MultiplayerPhaseManager.ts`
- Use same phase system as single-player
- Remove duplicated logic
- Ensure only difference is network communication

#### Step 5.3: Simplify PhaseManager
**File**: `Scenes/Battleground/PhaseManager.ts`
- Remove legacy `renderPhaseByName()`
- Unify `renderPhase()` for both single and multiplayer
- Clean up conditional logic

### Phase 6: Documentation & Cleanup

#### Step 6.1: Update Documentation
- Create state diagram showing all phase transitions
- Document action categories and their behaviors
- Add troubleshooting guide
- Update architecture.md

#### Step 6.2: Remove Old Code
- Delete old `transitionToNextState_v1()`
- Remove feature flags
- Delete deprecated files
- Clean up imports

#### Step 6.3: Final Testing
- Run full test suite
- Manual testing of all phase transitions
- Test save/load compatibility
- Test multiplayer synchronization

---

## Testing Strategy

### Unit Tests (Per Handler)
```typescript
describe('ShopPhaseHandler', () => {
  describe('canHandle', () => {
    it('handles card purchase in shop phase');
    it('handles skip_shop in shop phase');
    it('rejects actions in wrong phase');
  });
  
  describe('transition', () => {
    it('transitions to encounter after shop');
    it('transitions to combat_encounter when appropriate');
    it('preserves team state');
    it('increments step counter correctly');
  });
  
  describe('validateAction', () => {
    it('validates card is in available options');
    it('validates player has not exceeded party size');
  });
});
```

### Integration Tests
```typescript
describe('Phase System Integration', () => {
  it('completes full round cycle', async () => {
    // encounter -> shop -> encounter -> shop -> encounter -> shop -> combat -> upgrade
  });
  
  it('handles edge cases', () => {
    // discard during shop
    // skip encounter
    // rapid actions
  });
  
  it('maintains compatibility with old saves');
});
```

### E2E Tests
**File**: `e2e/phase_transitions.spec.ts`
- Test full game flow with new system
- Test all phase transitions in browser
- Verify UI updates correctly
- Test error recovery

### Regression Fixtures
- Replay the captured golden sessions through both V1 and V2 transition pipelines and assert identical session snapshots at every step.
- Add property-based tests that randomize action sequences within legal bounds to guard against unhandled combinations.

---

## Migration Plan

### Backward Compatibility

#### Save Game Compatibility
- New system reads same SessionData format
- No schema changes required
- Old saves work with new system

#### Multiplayer Compatibility
- Server API unchanged
- Client-side changes only
- Gradual rollout by version

### Feature Flag Strategy
```typescript
// config.ts
export const PHASE_SYSTEM_CONFIG = {
  useNewSystem: process.env.USE_NEW_PHASE_SYSTEM === 'true',
  logDifferences: process.env.LOG_PHASE_DIFFERENCES === 'true',
  parallelValidation: process.env.PARALLEL_PHASE_VALIDATION === 'true',
};
```

### Rollout Stages
1. **Development**: New system enabled, parallel validation
2. **Internal Testing**: Select users, monitor for issues
3. **Beta**: 50% of users on new system
4. **Full Release**: 100% of users, remove old code
5. **Cleanup**: Remove feature flags and old implementation

---

## Risk Mitigation

### High-Risk Areas
1. **Combat phase transitions** - Most complex, highest impact
2. **Step counter logic** - Affects phase sequencing
3. **Multiplayer synchronization** - Timing issues possible

### Mitigation Strategies

#### Combat Phase
- Migrate combat last, after other phases proven stable
- Extra integration tests for combat scenarios
- Manual QA focused on combat transitions

#### Step Counter
- Document expected behavior clearly
- Add validation that catches step mismatches
- Consider simplifying step logic in Phase 2

#### Multiplayer
- Server remains unchanged initially
- Client-side changes only
- Extensive multiplayer testing
- Rollback plan ready

### Rollback Plan
1. Keep feature flag in production for 2 weeks
2. Monitor error rates and user reports
3. If issues detected, flip flag to disable new system
4. Fix issues, re-enable flag
5. Only remove old code after 2 weeks of stable operation

---

## Success Metrics

### Code Quality Metrics
- [ ] Test coverage > 90% for phase system
- [ ] Cyclomatic complexity < 10 per function
- [ ] Zero linting errors
- [ ] All handlers < 100 lines

### Bug Metrics
- [ ] Zero phase-related bugs in first week of rollout
- [ ] 50% reduction in phase-related bug reports
- [ ] Average time to fix phase bugs reduced by 70%

### Performance Metrics
- [ ] Phase transitions < 50ms (no performance regression)
- [ ] Memory usage unchanged
- [ ] Save file size unchanged

### Developer Experience
- [ ] New phases can be added in < 1 hour
- [ ] New actions can be added in < 30 minutes
- [ ] Phase transition bugs are easy to locate and fix

---

## Future Enhancements

### After Refactoring Complete

#### 1. Visual Phase Editor
- Drag-and-drop phase transition editor
- Visual state machine diagram
- Generate code from visual representation

#### 2. Replay System
- Record action log
- Replay any game from start
- Debug phase issues by replaying problematic sequences

#### 3. Dynamic Phase Configuration
- Define phases in JSON
- Allow mods to add new phases
- Hot-reload phase configuration

#### 4. Advanced Validation
- AI-based phase sequence validation
- Detect impossible game states
- Suggest fixes for invalid states

---

## Appendix A: Current Phase Flow

```
Round Start
  ↓
Step 1: Encounter → Shop
  ↓
Step 2: Encounter → Shop
  ↓
Step 3: Encounter → Shop
  ↓
Step 4: Combat Encounter (warning)
  ↓
Step 5: Combat
  ↓
Step 6: Upgrade Core / Add Reaction (before round 15)
  ↓
Next Round (Step 1)
```

## Appendix B: Action Matrix

| Action           | Current Phase | Next Phase                 | Step Change | Notes              |
|------------------|---------------|----------------------------|-------------|--------------------|
| encounter_id     | encounter     | shop                       | +1          | Regular encounter  |
| upgrade_unit     | encounter     | orb_shop                   | +1          | Special encounter  |
| skip_encounter   | encounter     | shop                       | +1          | Skip button        |
| card_id          | shop          | encounter/combat_encounter | 0           | Purchase card      |
| skip_shop        | shop          | encounter/combat_encounter | 0           | Skip purchase      |
| discard_unit     | shop          | shop                       | 0           | Meta action        |
| apply_orb        | orb_shop      | orb_shop                   | 0           | Sub-phase          |
| orb_shop_done    | orb_shop      | encounter/combat_encounter | 0           | Complete orb shop  |
| combat_encounter | encounter     | combat                     | 0           | Pre-combat warning |
| combat_done      | combat        | upgrade_core/encounter     | +1          | After combat       |
| upgrade_option   | upgrade_core  | encounter                  | +1, round+1 | Select upgrade     |

## Appendix C: Questions to Resolve

1. **Should we keep the step counter?**
   - Alternative: Use phase history/sequence
   - Decision: [TBD]

2. **How to handle phase-specific UI state?**
   - Should handlers provide UI hints?
   - Decision: [TBD]

3. **When to validate actions?**
   - Client-side, server-side, or both?
   - Decision: [TBD]

4. **How to handle save migration?**
   - Need migration for any save format changes?
   - Decision: [TBD]

---

## Sign-off

- [ ] Technical Lead Review
- [ ] Product Owner Approval
- [ ] QA Lead Acknowledgment
- [ ] Rollout Strategy Confirmed

**Last Updated**: January 30, 2026

---

## Implemented Architecture

As of January 30, 2026, the `GameLogic` transition system has been successfully refactored to use a modular State Machine pattern.

### Structure

1.  **PhaseManager**: The central orchestrator. It receives transition requests, delegates to the appropriate handler, and applies results to the session state.
    *   File: `Core/PhaseSystem/PhaseManager.ts`

2.  **ActionRegistry**: A registry defining the nature of every action in the game. It categorizes actions into:
    *   `PHASE_TRANSITION`: Moves the game state forward (e.g., buying a unit, finishing combat).
    *   `META_ACTION`: Modifies state without changing phase (e.g., `discard_unit`).
    *   `SUB_PHASE`: Interactions within a specific phase UI (e.g., `apply_orb`).
    *   `PHASE_SKIP`: Explicitly skips a phase (e.g., `skip_shop`).
    *   File: `Core/PhaseSystem/ActionRegistry.ts`

3.  **PhaseValidator**: A robust validation layer ensuring:
    *   The transition from Phase A to Phase B is legal.
    *   The requested action is present in `current_options` (with exceptions for system/meta actions).
    *   File: `Core/PhaseSystem/PhaseValidator.ts`

4.  **Handlers**: Specific logic for each phase is encapsulated in dedicated handler classes extending `BasePhaseHandler`.
    *   **EncounterPhaseHandler**: Manages regular encounters and transitions to special Orb Shop encounters.
    *   **ShopPhaseHandler**: Manages buying units and skipping the shop.
    *   **CombatPhaseHandler**: Manages post-combat progression, victories, and game overs.
    *   **OrbShopPhaseHandler**: Manages orb application logic.
    *   **Upgrade/Reaction Handlers**: Manage core upgrade phases.
    *   Location: `Core/PhaseSystem/handlers/`

### Integration with Core

The legacy `GameLogic.ts` now acts as a facade:
*   **`transitionToNextState`**:
    1.  Calls `resolveAction` to update team/unit state (backward compatibility).
    2.  Generates a deterministic seed.
    3.  Calls `phaseManager.transition()` to determine the next phase, options, and step/round increments.
    4.  Applies the result to the session.
    5.  Executes side effects (like simulating combat if the new phase is `combat`).

### Key Improvements

*   **Testability**: Each handler can be tested in isolation.
*   **Safety**: Invalid transitions are caught by the validator before corrupting state.
*   **Clarity**: Phase progression rules are centralized in `PhaseConfig.ts` and individual handlers, rather than a monolithic `if/else` block.
