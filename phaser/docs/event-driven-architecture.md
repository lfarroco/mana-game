# Event-Driven Architecture: System Consolidation

This document explains the event-driven architecture implemented for Architecture Proposal Item 3: Consolidation of Systems.

## Overview

The architecture separates business logic from visual concerns using an event-driven pattern:
- **Pure Systems**: Accept state, return events (no side effects)
- **Visualizer**: Subscribes to events, handles visual updates
- **Scene**: Orchestrates when systems run, not how they work

## Architecture Diagram

```
┌─────────────────┐
│                 │
│  User Action    │
│  (Click/Drag)   │
│                 │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────┐
│                                     │
│  Event Handler                      │
│  (itemClickPurchaseRequested)       │
│                                     │
│  1. Validate with pure functions    │
│  2. Call GameController (server)    │
│  3. Update state                    │
│  4. Emit events                     │
│                                     │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│                                     │
│  Pure System (PureShop.ts)          │
│                                     │
│  - processPurchase(state, ...)      │
│  - processSale(state, ...)          │
│  - Returns: { events, newUnit }     │
│                                     │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│                                     │
│  System Events (Events.ts)          │
│                                     │
│  - UnitPurchased                    │
│  - PurchaseFailed                   │
│  - UnitSold                         │
│  - UnitSpawned                      │
│  - etc.                             │
│                                     │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│                                     │
│  Visualizer (Visualizer.ts)         │
│                                     │
│  - Subscribe to events              │
│  - Handle visual updates            │
│  - Manage Phaser GameObjects        │
│  - Play animations                  │
│                                     │
└─────────────────────────────────────┘
```

## Components

### 1. System Events (`src/Systems/Events.ts`)

Defines all event types that systems can emit:

```typescript
export type UnitPurchasedEvent = SystemEvent & {
  type: "UnitPurchased";
  cardId: string;
  shopCharaId: string;
  wasUpgrade: boolean;
  unit?: Unit;
  upgradedUnit?: Unit;
};
```

**Key Features:**
- Strongly typed events
- Helper functions for event creation
- Union types for grouped events

### 2. Pure Systems (`src/Systems/Shop/PureShop.ts`)

Pure functions that accept state and return events:

```typescript
export function processPurchase(
  session: SessionData,
  shopUnitCardId: string,
  shopCharaId: string,
  dragStartPosition: { x: number; y: number }
): PurchaseResult {
  // Pure logic - no side effects
  // Returns events to emit
}
```

**Key Features:**
- No side effects (no state mutation, no Phaser calls)
- Testable in isolation
- Follows functional programming principles
- Returns events describing what should happen

### 3. Visualization Layer (`src/Engine/Visualizer.ts`)

Subscribes to events and handles visual updates:

```typescript
export class Visualizer {
  public async emit(event: SystemEvents.AllSystemEvents): Promise<void> {
    // Dispatch to appropriate handler
  }

  private async handleUnitPurchased(event: SystemEvents.UnitPurchasedEvent): Promise<void> {
    // Handle all visual updates for purchase
    // - Summon unit
    // - Play animations
    // - Update UI
  }
}
```

**Key Features:**
- Event subscription system
- Handles all Phaser GameObject manipulations
- Manages animations and visual effects
- Uses classes (acceptable for Phaser integration per mana-battle-standards)

### 4. Refactored Event Handlers

Event handlers now follow the pattern:

```typescript
export async function itemClickPurchaseRequested(...): Promise<void> {
  // 1. Use pure functions to validate and determine outcome
  const purchaseResult = PureShop.processPurchase(state.session, ...);

  if (!purchaseResult.success) {
    // Emit failure events
    for (const event of purchaseResult.events) {
      await emitSystemEvent(event);
    }
    return;
  }

  // 2. Call GameController for server validation
  const serverSuccess = await controller.purchaseUnit(...);

  // 3. Update game state
  state.session.team.units = PureShop.addUnitToUnits(...);

  // 4. Emit success events for Visualizer
  for (const event of purchaseResult.events) {
    await emitSystemEvent(event);
  }
}
```

## Testing

Pure systems can be tested in isolation without Phaser:

```typescript
describe('PureShop', () => {
  it('should successfully purchase a new unit when party is not full', () => {
    const result = PureShop.processPurchase(mockSession, 'mana_crystal', ...);
    
    expect(result.success).toBe(true);
    expect(result.newUnit).toBeDefined();
    expect(result.events.length).toBe(1);
    expect(result.events[0].type).toBe('UnitPurchased');
  });
});
```

**Benefits:**
- Fast tests (no Phaser initialization)
- Easy to test edge cases
- Pure functions guarantee consistent results

## Integration with BattlegroundScene

```typescript
export class BattlegroundScene extends Phaser.Scene {
  start = async ({ state, ...data }: BattlegroundSceneData) => {
    // Initialize the Visualizer early in the scene startup
    initializeVisualizer(this);
    
    // ... rest of scene setup
  }

  cleanup() {
    // Destroy the visualizer on scene shutdown
    destroyVisualizer();
    
    // ... rest of cleanup
  }
}
```

## Next Steps

To complete the consolidation, other systems need to be refactored:

1. **Combat System**: Create pure combat functions that return events
2. **Regen System**: Refactor to emit events instead of directly updating visuals
3. **Poison System**: Refactor to emit events instead of directly updating visuals
4. **Phase System**: Refactor to emit events for phase transitions

For each system:
1. Create pure functions in `src/Systems/Pure{SystemName}.ts`
2. Define events in `src/Systems/Events.ts`
3. Add event handlers to Visualizer
4. Update existing code to use pure functions and emit events
5. Write unit tests for pure functions

## Benefits

### Separation of Concerns
- Business logic is separate from visual logic
- Systems don't need to know about Phaser
- Easier to understand and maintain

### Testability
- Pure functions can be tested without Phaser
- No need to mock Phaser objects
- Fast, reliable tests

### Server-Side Compatibility
- Pure functions can run on the server
- No Phaser dependencies in game logic
- Enables server-side game validation

### Flexibility
- Easy to add new visual effects without changing game logic
- Visual updates can be disabled/replaced (e.g., for testing)
- Multiple visualizers possible (e.g., for replays, spectating)

## Mana-Battle-Standards Compliance

This architecture follows the mana-battle-standards:
- ✅ **Prefer functional programming**: Pure functions for business logic
- ✅ **Use classes for Phaser integration**: Visualizer uses a class
- ✅ **Avoid unnecessary inheritance**: No inheritance chains, composition used

## Files Modified/Created

- `phaser/src/Systems/Events.ts` - Event type definitions (new)
- `phaser/src/Systems/Shop/PureShop.ts` - Pure shop functions (new)
- `phaser/src/Systems/Shop/PureShop.test.ts` - Unit tests (new)
- `phaser/src/Client/Visualizer.ts` - Visualization layer (new)
- `phaser/src/Systems/Shop/events/itemClickPurchaseRequested.ts` - Refactored
- `phaser/src/Systems/Shop/events/ownedUnitSold.ts` - Refactored
- `phaser/src/Client/Scenes/Battleground/BattlegroundScene.ts` - Integrated Visualizer
- `phaser/ARCHITECTURE_PROPOSALS.md` - Updated status

## References

- [Architecture Proposals](../ARCHITECTURE_PROPOSALS.md)
- [Mana Battle Standards](../../.github/instructions/mana-battle-standards.instructions.md)
