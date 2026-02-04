# Project Architecture & Refactoring Proposals

Based on the recent refactoring of the State system and an analysis of the codebase, here are several proposals to improve the project's organization, scalability, and maintainability.

## 1. Directory Structure Reorganization

The current structure mixes View logic (Phaser Scenes) with Business Logic (Systems) and Data Models. A clearer separation of concerns is recommended.

### Current Pain Points:
- `src/Scenes/Battleground` contains heavy logic (`Systems/`), making the View layer "fat".
- Systems are split between `src/Systems` (e.g., Chara) and `src/Scenes/Battleground/Systems` (e.g., Shop).
- `Core/` contains some logic, but `GameLogic.ts` is doing double duty as a server simulator and local helper.

### Proposed Structure:

```text
src/
├── Core/               # Pure Game Logic (Platform Agnostic)
│   ├── State/          # State definitions (SessionData, State)
│   ├── Logic/          # Rules (Combat, RNG, Shops, Encounters)
│   └── Actions/        # Reducer-style actions for state mutation
├── Engine/             # Phaser/View Layer
│   ├── Scenes/         # Scenes (Battleground, MainMenu) - strict View logic
│   ├── Entities/       # Visual representations (Chara sprite management)
│   └── UI/             # UI Components (DOM or Phaser based)
├── Systems/            # Game Systems (Managers)
│   ├── ShopSystem.ts
│   ├── CombatSystem.ts
│   └── EncounterSystem.ts
├── Network/            # Connectivity
│   ├── Simulation/     # Local "Server" for Single Player
│   ├── Multiplayer/    # WebSocket/Socket.io logic
│   └── GameController.ts # Unified Interface (see Section 2)
└── Shared/             # Constants, Types, Utils
```

---

## 2. Unifying Client/Server Interaction (The "Controller" Pattern)

Currently, UI event handlers (like `itemClickPurchaseRequested`) contain explicit checks for `isMultiplayer`. This leaks infrastructure details into the UI and creates duplicate logic paths.

### Proposal: `GameController` Interface

Create a unified interface that the UI interacts with, hiding the implementation detail of whether the game is local or multiplayer.

```typescript
// interface IGameController
interface IGameController {
    purchaseUnit(cardId: string, targetSlot?: number): Promise<void>;
    skipPhase(): Promise<void>;
    selectEncounter(encounterId: string): Promise<void>;
}
```

### Implementations:

1.  **`RemoteGameController`**: Sends WebSocket messages (`MultiplayerManager`).
2.  **`LocalGameController`**: Calls `GameLogic` functions directly and mutates the local state.

**Benefit**: The UI code becomes:
```typescript
// UI Component
onBuyClick(unitId) {
    // The controller is injected or retrieved from context
    await gameController.purchaseUnit(unitId);
    // UI updates automatically via state subscription
}
```

---

## 3. Consolidation of Systems

Move all logic systems out of `src/Scenes`. The Scene should orchestrate **when** things run, not **how** they work.

*   **Move**: `src/Scenes/Battleground/Systems/*` $\rightarrow$ `src/Systems/*`
*   **Refactor**: Ensure these systems accept `State` or `SessionData` as input and return mutations or events, rather than manipulating Phaser GameObjects directly.
*   **Visuals**: Create a layer (e.g., `Visualizer` or `Renderer`) that listens to System events (like "UnitDamaged") and plays animations. Currently, `Chara.ts` mixes data logic (stats) with sprite logic.

---

## 4. State Management: Explicit Actions

We have unified `SessionData`, but mutations are currently scattered across the codebase (e.g., `state.session.team.units.push(...)` happens inside UI handlers).

### Proposal: Action/Reducer Pattern
Adopt a stricter mutation pattern, similar to the commands sent to the server.

1.  **Define Actions**: `PURCHASE_UNIT`, `TAKE_DAMAGE`, `END_TURN`.
2.  **Central Processor**: A function that takes `(State, Action)` and produces `NewState`.
3.  **Sync**: In Multiplayer, the server sends the Resulting State (or the Action), and the client applies it. In Single Player, the Local Controller applies it immediately.

This makes "Time Travel" debugging, Replays, and Sync logic significantly easier.

---

## 5. View-Logic Decoupling (ECS-Lite)

For the Combat system specifically, consider moving further toward an Entity-Component-System (ECS) approach or a strict Model-View-Presenter.

*   **Model**: The `SessionData` and `BattleData`. Pure JSON.
*   **Logic**: Functions that calculate damage, cooldowns, etc. (No imports from `phaser`).
*   **View**: The `BattlegroundScene`. It watches the Model.
    *   *If `model.unit[0].hp` changes*, update the health bar.
    *   *If `model.unit[0]` is removed*, play death animation then destroy sprite.

**Goal**: You should be able to run the entire game loop in a Node.js terminal (for server-side validation or testing) without importing Phaser. We are close to this with `GameLogic.ts`, but `Chara.ts` and others still bridge the gap too mostly.

## 6. Next Steps (Roadmap)

1.  **Refactor `Systems`**: Move `Encounter`, `Shop`, `CombatStats` out of `Scences/Battleground` into a top-level `Systems` folder.
2.  **Implement `GameController`**: Create the interface and refactor one feature (e.g., `HeroShop`) to use it, removing `if(isMultiplayer)` from the UI.
3.  **Strict "No-Phaser" Core**: Identify business logic files that import `phaser` and refactor them to remove that dependency, ensuring server-side compatibility.

## 7. Executed Improvements

- **Directory Structure Update (Isolating View Logic)**:
    - Created `src/Engine` directory.
    - Moved `src/Scenes` to `src/Engine/Scenes` to distinguish View logic from Core logic and other Systems.
    - Updated `tsconfig.json`, Webpack configurations (`config.dev.cjs`, `config.prod.cjs`), and Jest configuration to map `@Scenes` to `src/Engine/Scenes`.
    - Added new path aliases to `tsconfig.json` and `jest.config.cjs` to simplify imports and resolve compilation errors: `@Data`, `@Game`, `@TriggerSystem`, `@config`, `@assets`, `@utils`.
    - Refactored relative imports throughout the codebase to align with the new directory structure, replacing broken relative imports with consistent aliases.
