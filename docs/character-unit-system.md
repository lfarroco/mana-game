# Character/Unit System

The **Character/Unit System** handles unit definitions, creation, management, and visual representation in Mana Battle. It encompasses card data, unit instantiation, stat management, and Phaser-based rendering.

## Overview

Units are the core gameplay entities that players collect, upgrade, and deploy in combat. Each unit has defined stats, abilities (effects), and reactions that determine its behavior in battle.

## Core Components

### Unit Model (`Unit.ts`)

Located in `phaser/src/Models/Entities/Unit.ts`.

Defines the `Unit` type with all properties:
- **Identity**: `id`, `cardId`, `pic`, `force`, `position`, `isCore`
- **Stats**: `power`, `bonusPower`, `life`, `maxLife`, `shield`, `cooldown`, `rank`
- **Abilities**: `effects` (actions), `reactions` (responses)
- **State**: `charge`, `refresh`, `hasted`, `slowed`
- **Special**: `critical?`, `bonusCritical?`, `evade`

Key functions:
- `makeUnit()`: Creates unit from card definition
- `createUnitFromCardSpec()`: Low-level unit creation
- `upgradeUnitData()`: Handles unit upgrades

### Card Definitions (`Card.ts`)

Located in `phaser/src/Models/Entities/Card.ts`.

Manages unit card data:
- **Base Collection**: `BASE_COLLECTION_DATA` in `phaser/src/Data/BaseCollection.ts` contains all unit definitions
- **Registration**: `registerCollection()` loads card data
- **Lookup**: `getCardDefinition()` retrieves card by ID

Card properties:
- Basic stats (power, life, cooldown)
- Effects and reactions arrays
- Visual assets (pic)
- Metadata (name, rank, isCore)

### Chara System (`Chara/`)

Located in `phaser/src/Systems/Chara/`.

Manages visual unit representations in Phaser:

#### Core (`Chara.ts`)
- **Container Management**: Each unit is a Phaser Container
- **Summoning**: `summon()` creates units with animation effects
- **Lifecycle**: `create()`, `destroy()`, `clearAll()`
- **State Tracking**: WeakMap for unit state, Map for ID lookup

#### Visual Components
- **PowerDisplay.ts**: Shows current power value
- **ChargeBarDisplay.ts**: Visual cooldown/progress bar
- **RankDisplay.ts**: Unit rank indicator
- **CharaTooltip.ts**: Hover information popup

#### Input Handling (`input.ts`)
- **Drag & Drop**: Unit placement on board
- **Click Events**: Shop purchases, unit selection
- **Multiplayer Integration**: Delegates to server for multiplayer actions

#### Animations (`Animations/`)
- **popText.ts**: Damage/heal number popups
- **Other effects**: Summon animations, status effects

## Unit Creation Flow

```
Card Definition (JSON/data)
    ↓
makeUnit(cardId, position)
    ↓
createUnitFromCardSpec(cardDef, position)
    ↓
Unit object with effects/reactions cloned
    ↓
Chara.create(unit) → Phaser Container
    ↓
Visual components added (sprite, displays, bars)
```

## Stat Management

### Power System
- **Base Power**: From card definition
- **Bonus Power**: Temporary/permanent modifiers
- **Display**: Real-time updates via `PowerDisplay`

### Cooldown System
- **Charge**: Accumulates over time (0-100)
- **Refresh**: Cooldown after action (counts down)
- **Haste/Slow**: Modifiers affecting charge rate
- **Visual**: `ChargeBarDisplay` shows progress

### Health System
- **Life**: Current/maximum health
- **Shield**: Damage absorption
- **Regeneration**: Passive healing over time

## Effects and Reactions

### Effects (Actions)
- Defined in `TriggerSystem.Effect[]`
- Executed when unit's cooldown completes
- Types: damage, heal, shield, poison, haste, etc.

### Reactions
- Defined in `TriggerSystem.EffectReaction[]`
- Triggered by other units' effects
- Conditions: effect type, source position, targeting

## Visual Representation

### Sprite Management
- **Asset Loading**: `loadUnitAssets()` preloads textures
- **Positioning**: `getScreenPosition()` converts grid to screen coords
- **Flipping**: Enemy units flipped horizontally

### Interactive Elements
- **Drop Zones**: Board positions accept unit drops
- **Tooltips**: Show unit stats and abilities on hover
- **Selection**: Visual feedback for selected units

## Integration Points

- **Board System**: Position validation and placement
- **Shop System**: Unit purchasing and upgrading
- **Combat System**: Unit deployment and effect execution
- **Storage**: Unit persistence in save data
- **Balance System**: Cost calculations for effects

## Key Functions

### Unit Operations
- `summon(unit)`: Creates visual unit with effects
- `destroy(chara)`: Removes unit from board
- `upgrade(unit)`: Increases unit rank/stats

### State Queries
- `getCharaById(id)`: Find visual representation
- `getAllCharas()`: Get all active units
- `getUnitState(chara)`: Access unit data

### Visual Updates
- `updatePowerDisplay()`: Refresh stat displays
- `updateChargeBar()`: Show cooldown progress
- `showTooltip()`: Display unit information