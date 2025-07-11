# Shield System Documentation

## Overview

The shield system adds defensive capabilities to forces in the game. Shields act as a protective layer that absorbs damage before it affects the force's morale or health. The system includes visual shield bars that appear above the morale bars.

## Features

### Force Properties
- `shield`: Current shield amount (0 to maxShield)
- `maxShield`: Maximum shield capacity (0 means no shield)

### Visual Display
- Shield bars appear above morale bars
- Green shield bar for player, orange for CPU
- Bars automatically hide when maxShield is 0
- Smooth animations when shield values change

### Events
- `SHIELD_UPDATED`: Emitted when shield values change
- `SHIELD_BARS_SHOW`: Show the shield bars
- `SHIELD_BARS_HIDE`: Hide the shield bars

## API Reference

### Utility Functions

#### `setForceMaxShield(targetForce: Force, maxShield: number, scene?: Phaser.Scene): void`
Sets the maximum shield capacity for a force.
- Automatically adjusts current shield if it exceeds new maximum
- Emits `SHIELD_UPDATED` event if scene is provided

#### `manipulateForceShield(targetForce: Force, amount: number, scene?: Phaser.Scene): number`
Adds or removes shield from a force.
- Positive amount: Add shield (capped at maxShield)
- Negative amount: Remove shield (minimum 0)
- Returns actual change applied
- Emits `SHIELD_UPDATED` event if scene is provided

### Event Payloads

#### SHIELD_UPDATED
```typescript
{
  forceId: string,
  newShield: number,
  maxShield: number
}
```

## Usage Examples

### Basic Shield Setup
```typescript
// Give player 100 shield capacity
setForceMaxShield(playerForce, 100, scene);

// Add 50 shield to player
manipulateForceShield(playerForce, 50, scene);
```

### Damage Absorption
```typescript
function applyDamage(targetForce: Force, damage: number, scene?: Phaser.Scene): number {
  if (targetForce.shield > 0) {
    const absorbed = Math.min(damage, targetForce.shield);
    const remaining = damage - absorbed;
    
    // Remove absorbed damage from shield
    manipulateForceShield(targetForce, -absorbed, scene);
    
    return remaining; // Apply remaining damage to health/morale
  }
  return damage; // No shield, full damage applies
}
```

### Event Handling
```typescript
// Listen for shield changes
scene.events.on(GameEvents.SHIELD_UPDATED, (payload) => {
  console.log(`${payload.forceId} shield: ${payload.newShield}/${payload.maxShield}`);
});

// Show/hide shield bars
scene.events.emit(GameEvents.SHIELD_BARS_SHOW);
scene.events.emit(GameEvents.SHIELD_BARS_HIDE);
```

## Integration Notes

### Battle Flow Integration
The shield system is fully integrated with the battle lifecycle:

1. **Battle Start**: Shield bars automatically show alongside morale bars
2. **During Battle**: Shield values update in real-time via events
3. **Battle End**: Shield bars hide automatically with morale bars

### Shield Bar Lifecycle
```typescript
// When battle starts (_initializeMorale in BattleProgressionSystem):
scene.events.emit(GameEvents.SHIELD_BARS_SHOW);
scene.events.emit(GameEvents.SHIELD_UPDATED, { forceId, newShield, maxShield });

// When battle ends (_hideDisplayBars in BattleProgressionSystem):
scene.events.emit(GameEvents.SHIELD_BARS_HIDE);
```

### Pre-Battle Shield Setup
To give forces shields before battle, call setup functions before combat begins:

```typescript
import { setupBattleShields } from '../Examples/BattleShieldIntegration';

// In your game logic, before combat starts:
setupBattleShields(scene);
```

### Automatic Bar Management
- Shield bars automatically show when maxShield > 0
- Shield bars automatically hide when maxShield = 0
- No manual show/hide needed in most cases

### Positioning
- Player shield bar: 80px from bottom of screen
- CPU shield bar: 50px from top of screen
- Positioned above their respective morale bars

### Colors
- Player shield: Green (`0x9de04e`)
- CPU shield: Orange (`0xe0a04e`)

## Files Modified/Created

### Core Files
- `Force.ts`: Added shield properties and utility functions
- `events.ts`: Added shield-related events
- `constants.ts`: Added shield bar positioning and colors

### Display System
- `ShieldDisplay.ts`: New module for shield bar management
- `BattlegroundEventSystem.ts`: Integrated shield display

### Examples
- `ShieldSystemExamples.ts`: Usage examples and scenarios

## Future Enhancements

Potential future improvements:
- Shield regeneration over time
- Different shield types (energy, armor, etc.)
- Shield penetration mechanics
- Temporary vs permanent shields
- Shield overflow mechanics
