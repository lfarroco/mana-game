# Server-Side Testing Suite

This directory contains server-side tests for the unified single-player and multiplayer game logic.

## Overview

After the recent integration of single-player and multiplayer modes (see [single-multiplayer-unification.md](../docs/single-multiplayer-unification.md)), we now have comprehensive server-side tests that validate the complete game flow without requiring a UI or database.

## Agent Server

The same directory now also contains a headless HTTP server entrypoint for external agents:

```bash
npm run server:agents
```

Default address:

```text
http://127.0.0.1:8787
```

Optional CLI flags:

```bash
npm run server:agents -- --host 0.0.0.0 --port 9000
```

Primary endpoints:

- `GET /health`
- `POST /games` - create a new agent-playable run
- `GET /games/:gameId/state` - full board + choices + replay snapshot
- `GET /games/:gameId/board`
- `POST /games/:gameId/board` - apply board rearrangements
- `GET /games/:gameId/choices`
- `POST /games/:gameId/choices` - make a choice by id or 1-based index
- `GET /games/:gameId/cards/:cardId` - inspect a card definition
- `GET /games/:gameId/manifest` - fetch the replay manifest accumulated so far
- `DELETE /games/:gameId`

This API is backed by the pure Core `LlmPlayerService`, so it stays server-side and deterministic.

## Test Files

### FullSessionFlow.test.ts

A comprehensive test suite that validates the entire game session flow from start to finish, including:

#### Test Coverage

1. **Session Management**
   - Starting a new session with a selected crystal
   - Retrieving session state
   - Session persistence

2. **Phase Transitions**
   - Picking encounter choices
   - Advancing through phases (Encounter → Shop → Encounter → Shop → Combat)
   - Phase option generation

3. **Team Building**
   - Purchasing units from shops
   - Upgrading units
   - Team composition updates
   - Team state persistence across rounds

4. **Combat System**
   - Combat simulation
   - Combat log generation
   - Win/loss tracking
   - Enemy team scaling with round number

5. **Complete Game Sessions**
   - Full round completion (all phases)
   - Multi-round gameplay until victory or defeat
   - Win condition: 10+ wins
   - Loss condition: 4+ losses

6. **Edge Cases**
   - Session resumption
   - Orb shop mechanics
   - Action log tracking
   - Random seed generation and determinism

## Running the Tests

```bash
# Run all server tests
npm test server/

# Run only the full session flow tests
npm test server/FullSessionFlow.test.ts

# Run with verbose output
npm test server/FullSessionFlow.test.ts --verbose
```

## Implementation Details

### Server Adapter

The tests use `LocalServerAdapter` which implements the `IGameServer` interface. This provides:

- **In-memory session management** - No database required
- **Pure game logic** - No Phaser or UI dependencies
- **Full server-side simulation** - Complete combat simulation with deterministic outcomes
- **Interface compatibility** - Same interface as `MultiplayerServerManager` for consistency

### Test Structure

Each test follows this pattern:

1. Create a new session with a selected crystal
2. Perform actions through the `IGameServer` interface
3. Verify state changes and phase transitions
4. Assert expected outcomes

### Helper Functions

- `completeRound(playerId)` - Executes a full round from encounter through combat
  - Handles all phase transitions automatically
  - Returns combat result and updated session
  - Used by multi-round tests

## Game Flow

```
Session Start
    ↓
┌───────────────────┐
│  Round N          │
│                   │
│  Step 1: Encounter │ → Player picks encounter
│  Step 2: Shop/Orb  │ → Player buys/upgrades
│  Step 3: Encounter │ → Player picks encounter
│  Step 4: Shop/Orb  │ → Player buys/upgrades
│  Step 5: Encounter │ → Player picks encounter
│  Step 6: Shop/Orb  │ → Player buys/upgrades
│  Step 7: Combat    │ → Server simulates combat
│                   │
└───────────────────┘
    ↓
  Next Round
    ↓
Victory (10 wins) or Defeat (4 losses)
```

## Benefits

1. **Fast Testing** - No UI initialization or rendering
2. **Deterministic** - Seeded RNG ensures reproducible tests
3. **Comprehensive** - Tests the entire game loop
4. **Server-Side** - Validates authoritative game logic
5. **No Database** - Uses in-memory session management

## Future Enhancements

Potential areas for expansion:

- Load testing with multiple concurrent sessions
- Specific encounter/shop interaction tests
- Unit ability and effect validation
- Ghost system testing (PvP combat)
- Network latency simulation
- Save/load session state testing

## Related Documentation

- [Single-Multiplayer Unification](../docs/single-multiplayer-unification.md)
- [Combat Architecture](../docs/combat-architecture.md)
- [Storage System](../docs/storage-system.md)
