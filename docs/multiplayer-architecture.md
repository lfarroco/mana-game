# Multiplayer Architecture

This document describes the architecture of the multiplayer system in Mana Battle, which allows the game to support server-driven pvp gameplay while reusing the existing client infrastructure.

## Overview

The multiplayer system is designed to seamlessly integrate with the existing single-player experience. It works by intercepting local decision-making logic and delegating control to a central `MultiplayerManager`. The actual game state phases (Encounter, Shop, Combat) are driven by a server (mocked for now) rather than local loops.

Combat enemy selection is now server-authoritative: when the player confirms `combat_encounter`, the backend first attempts to select a random opponent team from players in a nearby rating band. If no suitable team is available, it falls back to the same PvE enemy-generation logic used in single-player.

## Core Components

### MultiplayerManager
`/src/Multiplayer/MultiplayerManager.ts`

The `MultiplayerManager` is a singleton that orchestrates the multiplayer state.
- **Flags**: `isMultiplayer` enables/disables the mode.
- **Communication**: Handles sending user selections (`sendOptionSelection`) and fetching the next phase options (`getPhaseOptions`).
- **Mocking**: Currently contains mock implementations for server responses.

### MultiplayerPhaseManager
`/src/Client/Screens/Battleground/MultiplayerPhaseManager.ts`

Replaces the local `PhaseManager` loop when in multiplayer mode.
- **Responsibility**: Requests the current phase and options from the `MultiplayerManager` and dispatches actions to the appropriate system (Encounter, Shop, etc.).
- **Phases Supported**:
  - `encounter`: Opens the encounter UI with server-provided options.
  - `shop`: Opens the hero shop with server-provided units.
  - `upgrade_core` / `add_reaction_core`: Opens the Effect Card shop for core upgrades.
  - `combat`: (Placeholder) Should trigger combat playback based on server results.

## Integration Points

The following existing systems were refactored to support multiplayer injection:

1.  **PhaseManager** (`/src/Client/Screens/Battleground/PhaseManager.ts`):
    - Checks `MultiplayerManager.isMultiplayer`.
    - Delegates to `handleMultiplayerPhase` instead of the local phase loop if active.

2.  **Encounter System** (`/src/Systems/Encounter.ts`):
    - `open` function accepts `options: string[]` to provide encounter choices.
    - If multiplayer is active, `onClick` handlers intercept the choice and send it to the server instead of applying local effects immediately.

3.  **Hero Shop** (`/src/Systems/Shop/HeroShop.ts`):
    - `openHeroShop` now accepts optional `serverCardIds: string[]` to populate the shop with specific units.

4.  **Effect Card Shop** (`/src/Systems/Shop/EffectCardShop.ts`):
    - Intercepts clicks on upgrade cards to send the selection to the server in multiplayer mode.

5.  **Input System** (`/src/Systems/Chara/input.ts`):
    - Intercepts clicks on shop items (units) to send purchase requests to the server instead of executing local purchase logic.

## Usage

To enable multiplayer mode:
```typescript
MultiplayerManager.getInstance().enableMultiplayer();
```

To disable:
```typescript
MultiplayerManager.getInstance().disableMultiplayer();
```

## Future Work

- **Server Connection**: Replace mock `MultiplayerManager` methods with real WebSocket/HTTP calls.
- **Combat Phase**: Implement `handleMultiplayerPhase` for `combat` to receive a combat log/replay from the server and pass it to the `CombatPlaybackController`.
- **UI State**: Better handling of waiting states (e.g., showing a spinner while waiting for other players).
