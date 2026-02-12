# Battle System

The **Battle System** manages the core combat loop, phase transitions, and board logic in Mana Battle. It orchestrates the flow from phase to phase, handles unit positioning and interactions on the 3x3 board, and coordinates combat execution.

## Overview

The battle system operates on a turn-based structure with distinct phases:
- **Encounter Phase**: Player makes choices (fight, shop, upgrade)
- **Shop Phase**: Purchase units and upgrades
- **Combat Phase**: Execute pre-calculated combat simulation with visual playback

## Core Components

### Phase Management (`PhaseManager.ts`)

Located in `phaser/src/Engine/Scenes/Battleground/PhaseManager.ts`.

The PhaseManager orchestrates the game flow:
- Delegates to `MultiplayerPhaseManager` for multiplayer mode
- Uses `getServerAdapter()` from `@Core/ServerFactory` for single-player mode
- Handles phase transitions and UI updates
- Manages background color changes per phase

Key functions:
- `startPhase(state, eventEmitter)`: Entry point for phase execution
- Phase-specific handlers for encounter, shop, combat, etc.

### Combat Phase (`CombatPhase.ts`)

Located in `phaser/src/Systems/CombatPhase.ts`.

Handles the transition to and execution of combat:
- `transitionToCombatPhase()`: Sets up combat state, disables input, summons units
- `handleCombatStartExecution()`: Starts combat playback using pre-calculated results
- Integrates with `runCombatIO()` for playback controller

Features:
- Automatic combat start (no manual ready button in current implementation)
- Support for server-provided enemy teams
- Ghost saving for potential future PVP features

### Board Logic (`Board.ts` & `BoardLogic.ts`)

Located in `phaser/src/Models/Board.ts` and `phaser/src/Models/BoardLogic.ts`.

#### Board Rendering (`Board.ts`)
- Creates 3x3 grid slots for both player and enemy boards
- Manages drop zones for unit placement
- Handles enemy board visibility toggling
- Renders energy slot shaders for visual feedback

Key functions:
- `createBoardState()`: Initializes board state
- `renderBoardSlots()`: Creates Phaser visuals for board positions
- `setIsInputEnabled()`: Controls player interaction
- `setEnemyBoardVisible()`: Shows/hides enemy units

#### Board Logic (`BoardLogic.ts`)
Contains pure functions for board operations:
- `getEmptySlot()`: Finds available board positions
- `findFreeSlot()`: Locates free slots for unit placement
- `checkMove()`: Validates position moves
- `createGrid()`: Initializes grid data structure

### Unit Management (`Chara/` System)

Located in `phaser/src/Systems/Chara/`.

The Chara system manages individual unit representations:
- `Chara.ts`: Core unit container management, summoning, destruction
- `input.ts`: Handles drag-and-drop and click interactions
- `PowerDisplay.ts`, `ChargeBarDisplay.ts`, `RankDisplay.ts`: Visual stat displays
- `CharaTooltip.ts`: Hover information
- `Animations/`: Summon effects, damage popups, etc.

Key features:
- Unit summoning with visual effects
- Interactive drag-and-drop placement
- Real-time stat display updates
- Tooltip system for unit information

## Combat Execution Flow

1. **Pre-calculation**: Combat outcomes are calculated server-side (local or remote)
2. **Setup**: `transitionToCombatPhase()` prepares the board and units
3. **Playback**: `CombatPlaybackController` executes visual effects based on logs
4. **Resolution**: Combat ends, phase transitions to next encounter/shop cycle

## Data Flow

```
PhaseManager
    ↓
getServerAdapter() (single-player) OR MultiplayerManager (multiplayer)
    ↓
CombatPhase.transitionToCombatPhase()
    ↓
Board.setEnemyBoardVisible() + Chara.summon() for all units
    ↓
runCombatIO() → CombatPlaybackController
    ↓
BrowserCombatEffects (visuals) + ServerCombatEffects (logs)
```

## Key Concepts

### Board Positions
- 3x3 grid (positions 0,0 to 2,2)
- Player board: Bottom-left origin
- Enemy board: Top-right origin (visually flipped)
- Units occupy specific grid positions

### Phase Transitions
- Automatic progression based on player choices
- Server-driven state management
- Event-driven UI updates

### Combat Playback
- Deterministic results from server-side calculation
- Client-side visual playback for performance
- Frame-based animation timing

## Integration Points

- **State Management**: Uses global `State` object for game state
- **Event System**: Emits events for UI updates (`EventEmitter`)
- **Asset Loading**: Coordinates with `Loader` system for unit assets
- **Audio**: Triggers sound effects during combat
- **Storage**: Saves game progress between phases