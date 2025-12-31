# Multiplayer Setup & Architecture

This document describes the multiplayer infrastructure for Mana Battle.

## Architecture

The multiplayer system consists of three main components:

1.  **Client**:
    *   `MultiplayerManager` (Singleton): Handles server communication, session management, and phase synchronization.
    *   `MultiplayerPhaseManager`: Orchestrates game flow based on server state.
    *   Hooks into `PhaseManager`, `Encounter`, and `HeroShop` to delegate logic to the server.

2.  **Server** (`phaser/server`):
    *   **Express API**: Endpoints for connecting, fetching state, and submitting actions.
    *   `MultiplayerServerManager`: Manages session state, game loop logic, and database interactions.
    *   **Game Loop**: 
        *   Round-based system with 3 steps per round (Encounter -> Shop -> Encounter -> Combat).
        *   Deterministic RNG using session seeds.

3.  **Database** (Postgres):
    *   `player_sessions`: Stores active session state (phase, round, step, seed, choices).
    *   `ghosts`: Stores player team compositions for PVP simulation.

## Prerequisites

- Docker & Docker Compose (for local database)
- Node.js & npm

## Running the Environment

### 1. Start the Database
The database runs in a Docker container.

```bash
cd server/db
docker-compose up -d --build
```

This starts Postgres on port `5432`.
*Note: The `--build` flag is important if schema changes are made.*

### 2. Start the Server
You can run the server directly:

```bash
npm run server
```
*(Make sure to add `"server": "tsx server/index.ts"` to scripts if not present, or run `npx tsx server/index.ts`)*

### 3. Run Integration Tests
We have a CI script that spins up a clean DB, runs the server, and executes end-to-end integration tests.

```bash
npm run test:server
```

## API Endpoints

- `POST /multiplayer/connect`: Start a new session or resume existing one.
- `GET /multiplayer/state?playerId=...`: Get current phase and options.
- `POST /multiplayer/action`: Submit a choice.
    - Body: `{ playerId, actionId, payload? }`
    - Payload used for sending team composition before combat.

## Game Loop details

1.  **Connect**: Client connects, server generates Seed.
2.  **Loop**:
    *   Step 1: Encounter
    *   Step 2: Shop
    *   Step 3: Encounter
3.  **Combat**:
    *   Client sends `ready_combat` action with Team payload.
    *   Server saves Ghost.
    *   Server transitions to Combat phase.
    *   (Coming Soon) Server simulates battle against a ghost.
4.  **Next Round**: Cycle repeats.
