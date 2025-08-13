# Combat Stats Tracking System

## Overview

The Combat Stats Tracking System provides comprehensive tracking of all combat actions during battle. It monitors damage dealt, healing provided, shields granted, and other combat metrics for each unit, enabling detailed post-combat analysis.

## Architecture

### Singleton Module Design

The system is implemented as a singleton module with module-level state and exported functions. This design provides:
- **Simplified API**: Direct function calls instead of class instantiation
- **Global Access**: Available throughout the application without dependency injection
- **Memory Efficiency**: Single instance with shared state
- **Easy Integration**: Clean imports and function-based usage

### Core Components

1. **CombatStatsTracker Module** (`src/Scenes/Battleground/Systems/CombatStatsTracker.ts`)
   - Module-level state management
   - Event-driven architecture with automatic and manual tracking
   - Lifecycle management (initialize → track → finalize)

2. **Integration Points**
   - `RunCombatIO.ts` - Main combat loop integration
   - Effect implementations - Direct stats attribution via singleton
   - Event system - Automatic tracking via game events

### Data Structure

```typescript
export type UnitCombatStats = {
  unitId: string;
  unitName?: string;
  forceId: string;
  damageDealt: number;        // Direct attack damage
  poisonApplied: number;      // Poison damage over time
  healingDone: number;        // Direct healing/morale restoration
  regenApplied: number;       // Regeneration healing over time
  shieldGranted: number;      // Shield points provided
  actionsPerformed: number;   // Number of actions taken
  timeAlive: number;          // Time spent in combat (milliseconds)
}
```

## Features

### Automatic Tracking
- **Event Listeners**: Automatically captures combat events
  - `MORALE_UPDATED` - Damage attribution
  - `UNIT_MORALE_RESTORED` - Healing attribution
  - `UNIT_SHIELD_GAINED` - Shield attribution
  - `UNIT_ATTACK` - Action counting

### Manual Tracking
- **Direct Attribution**: For effects that need explicit tracking
  - `trackDamage(unitId, amount, type)` - Record damage dealt
  - `trackHealing(unitId, amount, type)` - Record healing provided
  - `trackShield(unitId, amount)` - Record shield granted

### Data Aggregation
- **Individual Stats**: Per-unit detailed statistics
- **Force Stats**: Aggregated statistics by team/force
- **Combat Summary**: Complete battle overview

## API Reference

### Core Functions

#### Lifecycle Management
```typescript
// Initialize for new combat
initialize(scene: BattlegroundScene): void

// Stop tracking and finalize
stop(): void

// Reset state (testing)
reset(): void
```

#### Manual Tracking
```typescript
// Track damage dealt
trackDamage(sourceUnitId: string, damage: number, damageType?: 'normal' | 'poison'): void

// Track healing provided
trackHealing(sourceUnitId: string, healing: number, healingType?: 'direct' | 'regen'): void

// Track shield granted
trackShield(sourceUnitId: string, shield: number): void

// Update time alive
updateTimeAlive(delta: number): void
```

#### Data Retrieval
```typescript
// Get stats for specific unit
getUnitStats(unitId: string): UnitCombatStats | undefined

// Get all unit stats
getAllStats(): UnitCombatStats[]

// Get stats for specific force
getForceStats(forceId: string): UnitCombatStats[]

// Get aggregated force stats
getAggregatedForceStats(forceId: string): Omit<UnitCombatStats, 'unitId' | 'unitName'>

// Print summary to console
printStatsSummary(): void

// Get configuration
getConfig(): { isActive: boolean, trackedUnits: number, combatDuration: number }
```

## Integration Examples

### Singleton Module Usage
```typescript
import * as CombatStatsTracker from './Systems/CombatStatsTracker';

// Initialize for combat
CombatStatsTracker.initialize(scene);

// Track actions directly
CombatStatsTracker.trackDamage('unit1', 25, 'normal');
CombatStatsTracker.trackHealing('unit2', 15, 'direct');

// Get stats
const stats = CombatStatsTracker.getUnitStats('unit1');
const allStats = CombatStatsTracker.getAllStats();

// Cleanup
CombatStatsTracker.stop();
```

### Effect Integration
```typescript
// In effect implementations (dealDamage.ts, addShield.ts, etc.)
import * as CombatStatsTracker from '../../Scenes/Battleground/Systems/CombatStatsTracker';

// Direct tracking in effects
const actualDamage = applyDamageToForce(targetForce, damage, scene);
CombatStatsTracker.trackDamage(sourceUnit.id, actualDamage, 'normal');
```

### Combat Loop Integration
```typescript
// In RunCombatIO.ts
import * as CombatStatsTracker from './Systems/CombatStatsTracker';

// Initialize at combat start
CombatStatsTracker.initialize(this.scene);

// Update during combat loop
CombatStatsTracker.updateTimeAlive(delta * this.scene.time.timeScale);

// Stop at combat end
CombatStatsTracker.stop();
```

## Implementation Status

### ✅ Completed
- Singleton module architecture with clean function-based API
- Core tracking system with comprehensive metrics
- Event-driven automatic tracking
- Manual tracking APIs with simple function calls
- Integration with main combat loop
- Time tracking and lifecycle management
- Data aggregation and retrieval methods
- Comprehensive test suite (14 passing tests)
- Effect system integration:
  - `dealDamage.ts` - Damage attribution via singleton
  - `addShield.ts` - Shield attribution via singleton
  - `restoreMorale.ts` - Healing attribution via singleton
- System integration:
  - `PoisonDamageSystem` - Poison damage tracking
  - `RegenSystem` - Regeneration tracking
  - `TimeoutDamageSystem` - Timeout damage tracking

### 🔄 Ongoing
- Validation of all effect integrations
- Performance optimization for large battles

## Technical Details

### Singleton State Management
- Module-level variables for state persistence
- No class instantiation required
- Global accessibility with clean imports
- Memory efficient single instance

### Event Attribution
The system supports source attribution for all tracked metrics. Effects that modify unit stats can specify the source unit responsible for the change, enabling accurate tracking of who dealt damage, provided healing, etc.

### Performance Considerations
- Lightweight singleton with minimal memory footprint
- Event-driven design reduces polling overhead
- Optional manual tracking for precise control
- Configurable logging levels

### Error Handling
- Graceful handling when tracker is not active
- Safe handling of missing source attribution
- Validation of unit existence before tracking

## Testing

Comprehensive test suite covers:
- Initialization and lifecycle with singleton state
- Manual tracking APIs
- Event handling (automatic tracking removed for singleton)
- Data aggregation
- Time tracking
- Error scenarios
- State reset between tests

Run tests with:
```bash
npm test -- CombatStatsTracker.test.ts
```

## Advantages of Singleton Design

### Simplified Usage
- No dependency injection required
- Direct import and function calls
- Consistent API across the application
- Reduced boilerplate code

### Memory Efficiency
- Single instance across entire application
- No multiple tracker instances
- Shared state management
- Lower memory footprint

### Easy Integration
- Clean imports: `import * as CombatStatsTracker from '...'`
- Direct function calls: `CombatStatsTracker.trackDamage(...)`
- No scene reference passing required
- Simplified effect implementations

### Maintainability
- Centralized state management
- Clear function-based API
- Easy to mock for testing
- Consistent usage patterns

## Future Enhancements

### Potential Additions
- **Display Integration**: UI components for showing stats
- **Historical Tracking**: Battle-to-battle stat persistence
- **Advanced Metrics**: Hit rates, critical hits, efficiency ratios
- **Export Functionality**: JSON/CSV export for external analysis
- **Real-time Updates**: Live stat updates during combat
- **Filtering Options**: Stats by time period, damage type, etc.

### Display Ideas
- Post-combat statistics screen
- In-combat mini-displays
- Unit tooltips with current stats
- Comparative analysis between forces
- Performance rankings and achievements

## Migration Notes

### Changes from Class-Based Design
- **Import**: `import * as CombatStatsTracker from '...'` instead of class import
- **Initialization**: `CombatStatsTracker.initialize(scene)` instead of `new CombatStatsTracker(scene)`
- **Usage**: Direct function calls instead of instance methods
- **Testing**: Added `reset()` function for test isolation
- **Integration**: Simplified effect implementations with direct singleton access

The singleton design maintains all functionality while providing a cleaner, more efficient architecture suitable for the game's global stat tracking needs.
