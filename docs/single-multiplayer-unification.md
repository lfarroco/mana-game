# Single-Player and Multiplayer Logic Unification Plan

**Status**: In Progress
**Created**: January 28, 2026  
**Goal**: Unify single-player and multiplayer game logic to eliminate code duplication and enable single-player to use the same backend logic as multiplayer through a local server adapter.

## Table of Contents
- [Problem Statement](#problem-statement)
- [Current Architecture](#current-architecture)
- [Target Architecture](#target-architecture)
- [Refactoring Plan](#refactoring-plan)
- [Implementation Phases](#implementation-phases)
- [File Migration Map](#file-migration-map)
- [Code Examples](#code-examples)
- [Testing Strategy](#testing-strategy)
- [References](#references)

---

## Problem Statement

The codebase currently has **duplicated game logic** between single-player and multiplayer modes:

### Issues
1. **Logic Duplication**: Core game rules (encounters, shop, phase transitions) are implemented twice:
   - Once in single-player client code
   - Once in multiplayer server code (MultiplayerLogic.ts)

2. **Phaser Dependencies**: Single-player logic is tightly coupled with Phaser UI code, making it impossible to run on the server

3. **Maintenance Burden**: Bug fixes and features must be implemented twice, leading to inconsistencies

4. **Inconsistent Behavior**: Single-player and multiplayer can drift apart in gameplay mechanics

### Vision
- Single-player mode should use the **same core logic** as multiplayer
- Achieve this by running a **fake local server** when playing single-player
- All game logic lives in `src/Core/` with **zero Phaser dependencies**
- Client code only handles UI/presentation

---

## Current Architecture

### Single-Player Flow
```
Player Action 
  ↓
PhaseManager.ts (mixed logic + UI)
  ↓
Systems/Encounter.ts, Systems/Shop/, etc. (mixed logic + UI)
  ↓
Direct state mutation + Phaser rendering
```

**Key Files**:
- `src/Scenes/Battleground/PhaseManager.ts` - Phase orchestration
- `src/Scenes/Battleground/Systems/Encounter.ts` - Encounter logic + UI
- `src/Scenes/Battleground/Systems/Shop/HeroShop.ts` - Shop logic + UI
- `src/Scenes/Battleground/Systems/CombatPhase.ts` - Combat setup

**Problems**:
- Logic and UI are intertwined
- Imports Phaser types and components
- Cannot run on Node.js server

### Multiplayer Flow
```
Player Action
  ↓
MultiplayerManager (client)
  ↓
Supabase Edge Function
  ↓
MultiplayerServerManager
  ↓
MultiplayerLogic (pure logic)
  ↓
Database persistence
```

**Key Files**:
- `src/Multiplayer/MultiplayerManager.ts` - Client manager
- `src/Multiplayer/MultiplayerLogic.ts` - **Pure game logic** (no Phaser!)
- `server/MultiplayerServerManager.ts` - Server-side manager
- `supabase/functions/action/index.ts` - Edge function entry

**What's Good**:
- `MultiplayerLogic.ts` is already pure TypeScript
- Clean separation between client and server
- Reuses core combat simulation (`RunCombatCore.ts`)

### Shared Combat System ✅
The combat system is **already properly abstracted**:

- `src/Scenes/Battleground/RunCombatCore.ts` - Pure combat simulation
- `src/Scenes/Battleground/ServerCombatEffects.ts` - Server effects (logging)
- `src/Scenes/Battleground/BrowserCombatEffects.ts` - Client effects (visuals)
- `src/Scenes/Battleground/CombatPlaybackController.ts` - Playback from logs

This is the **reference architecture** for other systems to follow.

### Current src/Core/ Directory
The Core directory exists but is incomplete:
- `src/Core/createSession.ts` - Partially implemented, mixed code
- `src/Core/startNewGame.ts` - Empty file

---

## Target Architecture

### Unified Flow (Both Modes)
```
Player Action
  ↓
UI Layer (Phaser-dependent)
  ↓
Server Interface (IGameServer)
  ├─ Local Mode: LocalServerAdapter (in-memory)
  └─ Multiplayer: RemoteServerAdapter (Supabase)
  ↓
Core Game Logic (src/Core/, zero Phaser deps)
  ↓
State/Session Management
```

### Key Principles
1. **Interface Segregation**: Client only knows about `IGameServer` interface
2. **Dependency Inversion**: Core logic doesn't know about Phaser or network
3. **Single Responsibility**: Each layer has one job
4. **Reusability**: Same core logic runs in browser, server, and edge functions

### Server Interface
```typescript
interface IGameServer {
  // Session management
  createSession(playerId: string, crystalId: string): Promise<SessionData>;
  getSession(playerId: string): Promise<SessionData | null>;
  
  // Game flow
  getPhaseOptions(playerId: string): Promise<PhaseOptions>;
  handleAction(playerId: string, actionId: string, payload?: any): Promise<boolean>;
}
```

Both `LocalServerAdapter` and `MultiplayerServerManager` implement this interface.

---

## Refactoring Plan

### Phase 1: Extract Core Game Logic ⭐ START HERE
**Goal**: Create pure TypeScript game logic in `src/Core/` with zero Phaser dependencies.

**New Files to Create**:

#### 1.1 `src/Core/Types.ts`
Extract and consolidate types from `MultiplayerLogic.ts`:
```typescript
// Session state (exists in both SP and MP)
export type SessionData = {
  id: string;
  player_id: string;
  phase: PhaseType;
  round: number;
  step: number;
  seed: string;
  initial_seed: string;
  current_options: any;
  team: { units: Unit[] };
  wins: number;
  losses: number;
};

export type PhaseType = 
  | "encounter" 
  | "shop" 
  | "orb_shop"
  | "upgrade_core" 
  | "add_reaction_core" 
  | "combat" 
  | "victory" 
  | "game_over";

export type PhaseOptions = {
  phase: PhaseType;
  round: number;
  options: any[];
  combatState?: CombatState;
  team?: { units: Unit[] };
  wins?: number;
  losses?: number;
};

export type CombatState = {
  enemyTeam: Unit[];
  units: Unit[];
  logs: any[];
  seed: string;
};
```

#### 1.2 `src/Core/GameLogic.ts`
Move logic from `MultiplayerLogic.ts` (already pure!):
```typescript
export class GameLogic {
  // From MultiplayerLogic
  static createInitialSession(playerId: string, selectedCrystalId?: string): SessionData;
  static generateEncounterOptions(session: SessionData): { options: any[] };
  static generateShopOptions(session: SessionData): { options: any[] };
  static generateEnemyTeamForRound(round: number, wins: number): Unit[];
  static simulateCombat(session: SessionData): CombatResult;
  static transitionToNextState(session: SessionData, actionId: string, payload?: any): TransitionResult;
  static applyEncounterEffect(session: SessionData, encounterId: string): SessionData;
  static applyShopPurchase(session: SessionData, cardId: string, payload?: any): SessionData;
}
```

#### 1.3 `src/Core/SessionManager.ts`
Session lifecycle management:
```typescript
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  
  createSession(playerId: string, crystalId: string): SessionData;
  getSession(playerId: string): SessionData | null;
  updateSession(playerId: string, session: SessionData): void;
  deleteSession(playerId: string): void;
}
```

#### 1.4 `src/Core/PhaseTransitions.ts`
Pure phase flow logic:
```typescript
export class PhaseTransitions {
  static getNextPhase(currentPhase: PhaseType, round: number, step: number): PhaseType;
  static shouldIncrementRound(phase: PhaseType): boolean;
  static getPhaseForHour(hour: number): PhaseType; // Port from PhaseManager
}
```

**Migration Steps**:
1. Create `src/Core/Types.ts` - copy types from `MultiplayerLogic.ts` and `MultiplayerTypes.ts`
2. Create `src/Core/GameLogic.ts` - copy class from `MultiplayerLogic.ts` (minimal changes)
3. Create `src/Core/SessionManager.ts` - new in-memory implementation
4. Create `src/Core/PhaseTransitions.ts` - extract from `PhaseManager.ts`
5. Update `MultiplayerLogic.ts` to re-export from Core (backward compatibility)

**Validation**: 
- All Core files should have `import` statements only from:
  - Other Core files
  - `@Models/` (State, Unit, Force - already Phaser-free)
  - Pure utilities
- **Zero imports from Phaser or @PhaserIO**
- Run: `grep -r "from.*phaser" src/Core/` should return nothing

---

### Phase 2: Create Local Server Adapter
**Goal**: Implement the server interface for local (single-player) mode.

**New Files to Create**:

#### 2.1 `src/Core/IGameServer.ts`
The contract both adapters implement:
```typescript
export interface IGameServer {
  // Session
  createSession(playerId: string, crystalId: string): Promise<SessionData>;
  getSession(playerId: string): Promise<SessionData | null>;
  
  // Game flow
  getPhaseOptions(playerId: string): Promise<PhaseOptions>;
  handleAction(playerId: string, actionId: string, payload?: any): Promise<boolean>;
}
```

#### 2.2 `src/Core/LocalServerAdapter.ts`
Local in-memory implementation:
```typescript
import { IGameServer } from './IGameServer';
import { SessionManager } from './SessionManager';
import { GameLogic } from './GameLogic';

export class LocalServerAdapter implements IGameServer {
  private sessionManager = new SessionManager();
  
  async createSession(playerId: string, crystalId: string): Promise<SessionData> {
    const session = GameLogic.createInitialSession(playerId, crystalId);
    this.sessionManager.updateSession(playerId, session);
    return session;
  }
  
  async getSession(playerId: string): Promise<SessionData | null> {
    return this.sessionManager.getSession(playerId);
  }
  
  async getPhaseOptions(playerId: string): Promise<PhaseOptions> {
    const session = this.sessionManager.getSession(playerId);
    if (!session) throw new Error('No session found');
    
    // Same logic as MultiplayerServerManager
    const response: PhaseOptions = {
      phase: session.phase as any,
      round: session.round,
      options: [],
      team: session.team,
      wins: session.wins,
      losses: session.losses,
    };
    
    switch (session.phase) {
      case 'encounter':
        const encOpts = GameLogic.generateEncounterOptions(session);
        response.options = encOpts.options;
        break;
      case 'shop':
        const shopOpts = GameLogic.generateShopOptions(session);
        response.options = shopOpts.options;
        break;
      case 'combat':
        const simResult = GameLogic.simulateCombat(session);
        response.combatState = {
          units: simResult.initialUnits,
          logs: simResult.logs,
          enemyTeam: simResult.enemyTeam,
          seed: session.seed,
        };
        break;
    }
    
    return response;
  }
  
  async handleAction(playerId: string, actionId: string, payload?: any): Promise<boolean> {
    const session = this.sessionManager.getSession(playerId);
    if (!session) return false;
    
    const result = GameLogic.transitionToNextState(session, actionId, payload);
    this.sessionManager.updateSession(playerId, result.session);
    return true;
  }
}
```

#### 2.3 `src/Core/RemoteServerAdapter.ts`
Wrapper around Supabase calls (already exists conceptually in MultiplayerManager):
```typescript
import { IGameServer } from './IGameServer';
import { supabase } from '@lib/supabase';

export class RemoteServerAdapter implements IGameServer {
  async createSession(playerId: string, crystalId: string): Promise<SessionData> {
    const { data, error } = await supabase.functions.invoke('action', {
      body: { actionId: 'start_session', payload: { selectedCrystalId: crystalId } }
    });
    if (error) throw error;
    return data;
  }
  
  async getPhaseOptions(playerId: string): Promise<PhaseOptions> {
    const { data, error } = await supabase.functions.invoke('get-phase-options', {
      body: { playerId }
    });
    if (error) throw error;
    return data;
  }
  
  async handleAction(playerId: string, actionId: string, payload?: any): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('action', {
      body: { playerId, actionId, payload }
    });
    return !error;
  }
  
  async getSession(playerId: string): Promise<SessionData | null> {
    // Implementation depends on your Supabase setup
    return null;
  }
}
```

**Migration Steps**:
1. Create `src/Core/IGameServer.ts`
2. Create `src/Core/LocalServerAdapter.ts` - implements interface using Core logic
3. Create `src/Core/RemoteServerAdapter.ts` - wraps existing Supabase calls
4. Update `MultiplayerServerManager.ts` to implement `IGameServer` interface
5. Test local adapter with unit tests

**Validation**:
- LocalServerAdapter should pass same tests as MultiplayerServerManager
- No network calls in LocalServerAdapter
- Both adapters interchangeable via interface

---

### Phase 3: Refactor Client to Use Server Interface
**Goal**: Update PhaseManager and related UI code to use server abstraction.

#### 3.1 Update `src/Multiplayer/MultiplayerManager.ts`
Add server adapter selection:
```typescript
import { IGameServer } from '@Core/IGameServer';
import { LocalServerAdapter } from '@Core/LocalServerAdapter';
import { RemoteServerAdapter } from '@Core/RemoteServerAdapter';

export class MultiplayerManager {
  private server: IGameServer;
  
  constructor(isMultiplayer: boolean) {
    this.server = isMultiplayer 
      ? new RemoteServerAdapter()
      : new LocalServerAdapter();
  }
  
  async getPhaseOptions(playerId: string): Promise<PhaseOptions> {
    return this.server.getPhaseOptions(playerId);
  }
  
  // Other methods delegate to this.server...
}
```

#### 3.2 Refactor `src/Scenes/Battleground/PhaseManager.ts`
**Current** (mixed logic + UI):
```typescript
export async function startPhase(state: State, phase: string) {
  if (MultiplayerManager.getInstance().isMultiplayer) {
    await handleMultiplayerPhase(state);
    return;
  }
  
  // Single-player logic embedded here
  switch (phase) {
    case "shop":
      await HeroShop.openHeroShop();
      break;
    case "combat":
      CombatPhase.transitionToCombatPhase(state);
      break;
    // ...
  }
}
```

**Target** (UI only, delegates to server):
```typescript
import { getServerAdapter } from '@Core/ServerFactory';

export async function startPhase(state: State) {
  const server = getServerAdapter(); // Returns local or remote adapter
  const playerId = getPlayerId(); // From state or session
  
  // Ask server what to show
  const phaseOptions = await server.getPhaseOptions(playerId);
  
  // Render UI based on server response (same for both modes!)
  await renderPhase(state, phaseOptions);
}

async function renderPhase(state: State, options: PhaseOptions) {
  switch (options.phase) {
    case "encounter":
      await Encounter.open(state, options.options.map(o => o.id));
      break;
    case "shop":
      await HeroShop.openHeroShop(undefined, undefined, options.options.map(o => o.id));
      break;
    case "combat":
      await renderCombat(state, options.combatState);
      break;
    // ...
  }
}
```

#### 3.3 Clean Up UI Code
Files to update (remove embedded logic, keep only UI):
- `src/Scenes/Battleground/Systems/Encounter.ts`
  - Remove: Logic for picking encounters, applying effects
  - Keep: Rendering encounter cards, handling clicks
  - After click: Call `server.handleAction(playerId, encounterId)`

- `src/Scenes/Battleground/Systems/Shop/HeroShop.ts`
  - Remove: Logic for generating shop items, costs
  - Keep: Rendering shop UI, purchase animations
  - After purchase: Call `server.handleAction(playerId, 'buy_unit', { cardId })`

- `src/Scenes/Battleground/Systems/CombatPhase.ts`
  - Remove: Enemy team generation (use server's combatState)
  - Keep: UI setup, ready button, combat playback
  - Already mostly clean thanks to combat refactor!

**Migration Steps**:
1. Create `src/Core/ServerFactory.ts` - returns appropriate adapter
2. Update `PhaseManager.startPhase()` to use server interface
3. Update `Encounter.open()` - remove logic, keep UI, call server on action
4. Update `HeroShop.openHeroShop()` - remove logic, keep UI, call server on purchase
5. Update combat phase to use server-provided enemy teams
6. Remove `handleMultiplayerPhase()` - no longer needed, same code path!

**Validation**:
- Single-player mode works identically to before (but through local server)
- Multiplayer mode unchanged (uses remote server)
- No duplication between modes
- PhaseManager no longer has game logic, only UI orchestration

---

### Phase 4: Clean Up and Optimize
**Goal**: Remove dead code, fix imports, optimize performance.

#### 4.1 Remove Deprecated Code
Files to delete or consolidate:
- `src/Multiplayer/MultiplayerLogic.ts` - Logic moved to Core, can delete or make thin wrapper
- `src/Scenes/Battleground/MultiplayerPhaseManager.ts` - No longer needed, same as PhaseManager
- Duplicate encounter/shop logic in single-player systems

#### 4.2 Fix Import Paths
Update all imports to use Core:
```typescript
// Old
import { MultiplayerLogic } from '@Multiplayer/MultiplayerLogic';

// New
import { GameLogic } from '@Core/GameLogic';
```

#### 4.3 Add Path Aliases (tsconfig.json)
```json
{
  "compilerOptions": {
    "paths": {
      "@Core/*": ["src/Core/*"],
      "@Models/*": ["src/Models/*"],
      // ... existing aliases
    }
  }
}
```

#### 4.4 Performance Optimizations
- LocalServerAdapter: Keep session in memory, no serialization overhead
- Consider caching phase options if they don't change within a phase
- Profile combat simulation (already fast, but verify)

**Migration Steps**:
1. Delete deprecated files (after confirming nothing references them)
2. Run search/replace for import path updates
3. Update tsconfig.json with @Core alias
4. Run linter and fix all issues
5. Run full test suite
6. Profile performance (should be same or better)

**Validation**:
- No TypeScript errors
- All tests pass
- Game plays identically to before refactor
- Codebase smaller (less duplication)
- Easier to add new features (one place to change logic)

---

## File Migration Map

### Files to Create (New)
| File                              | Purpose                 | Dependencies           |
|-----------------------------------|-------------------------|------------------------|
| `src/Core/Types.ts`               | Shared type definitions | None (pure types)      |
| `src/Core/GameLogic.ts`           | Core game rules         | Types, Models          |
| `src/Core/SessionManager.ts`      | Session lifecycle       | Types                  |
| `src/Core/PhaseTransitions.ts`    | Phase flow logic        | Types                  |
| `src/Core/IGameServer.ts`         | Server interface        | Types                  |
| `src/Core/LocalServerAdapter.ts`  | Local implementation    | IGameServer, GameLogic |
| `src/Core/RemoteServerAdapter.ts` | Remote implementation   | IGameServer, Supabase  |
| `src/Core/ServerFactory.ts`       | Adapter factory         | Both adapters          |

### Files to Refactor (Update)
| File                                               | Changes                       | Difficulty |
|----------------------------------------------------|-------------------------------|------------|
| `src/Multiplayer/MultiplayerLogic.ts`              | Re-export from Core or delete | Easy       |
| `src/Multiplayer/MultiplayerManager.ts`            | Use IGameServer interface     | Medium     |
| `src/Scenes/Battleground/PhaseManager.ts`          | Remove logic, use server      | Hard       |
| `src/Scenes/Battleground/Systems/Encounter.ts`     | Remove logic, keep UI         | Medium     |
| `src/Scenes/Battleground/Systems/Shop/HeroShop.ts` | Remove logic, keep UI         | Medium     |
| `src/Scenes/Battleground/Systems/CombatPhase.ts`   | Use server's enemy team       | Easy       |
| `server/MultiplayerServerManager.ts`               | Implement IGameServer         | Easy       |

### Files to Delete (After Migration)
| File                                                 | Reason                     | When    |
|------------------------------------------------------|----------------------------|---------|
| `src/Scenes/Battleground/MultiplayerPhaseManager.ts` | Merged into PhaseManager   | Phase 3 |
| `src/Core/createSession.ts`                          | Replaced by SessionManager | Phase 1 |
| `src/Core/startNewGame.ts`                           | Empty/unused               | Phase 1 |

---

## Code Examples

### Example 1: Encounter Flow (Before & After)

#### Before (Single-Player)
```typescript
// PhaseManager.ts - Logic embedded
export async function startPhase(state: State, phase: string) {
  switch (phase) {
    case "encounter":
      Encounter.open(state); // Generates encounters internally
      break;
  }
}

// Encounter.ts - Generates options AND renders UI
export async function open(state: State) {
  const allEncounters = getEncounterItems(state); // Logic
  const available = allEncounters.filter(e => /* logic */); // Logic
  const chosen = pickRandom(available, 3); // Logic
  
  // Render UI
  chosen.forEach(encounter => {
    const card = createEncounterCard(encounter);
    card.onClick = () => {
      applyEncounterEffect(state, encounter.id); // Logic
      PhaseManager.handlePhaseEnded(state); // Trigger next phase
    };
  });
}
```

#### After (Unified)
```typescript
// PhaseManager.ts - Only UI orchestration
export async function startPhase(state: State) {
  const server = getServerAdapter(); // Local or remote
  const options = await server.getPhaseOptions(playerId);
  
  switch (options.phase) {
    case "encounter":
      await Encounter.open(state, options.options); // Server provides options
      break;
  }
}

// Encounter.ts - Only UI rendering
export async function open(state: State, encounterIds: string[]) {
  const server = getServerAdapter();
  
  encounterIds.forEach(id => {
    const encounter = getEncounterDefinition(id); // Just metadata
    const card = createEncounterCard(encounter);
    card.onClick = async () => {
      await server.handleAction(playerId, id); // Server handles logic
      await PhaseManager.startPhase(state); // Reload phase from server
    };
  });
}

// Core/GameLogic.ts - Pure logic (same for both modes)
export class GameLogic {
  static generateEncounterOptions(session: SessionData): { options: any[] } {
    const allEncounters = getAllEncounterIds();
    const available = allEncounters.filter(e => 
      e.minRound <= session.round && e.maxRound >= session.round
    );
    const chosen = pickRandom(available, 3);
    return { options: chosen.map(e => ({ id: e.id })) };
  }
  
  static applyEncounterEffect(session: SessionData, encounterId: string): SessionData {
    const newSession = { ...session };
    // Apply effect logic
    return newSession;
  }
}
```

### Example 2: LocalServerAdapter in Action

```typescript
// Game initialization (single-player)
const server = new LocalServerAdapter();
const session = await server.createSession('player-1', 'crystal_core');

// Player picks an encounter
const phaseOptions = await server.getPhaseOptions('player-1');
// Returns: { phase: 'encounter', options: [{ id: 'armory' }, { id: 'healing_tent' }] }

// Player clicks 'armory'
await server.handleAction('player-1', 'armory');

// Next phase
const nextOptions = await server.getPhaseOptions('player-1');
// Returns: { phase: 'shop', options: [{ id: 'archer' }, { id: 'mage' }] }

// Same code works for multiplayer, just different adapter!
const remoteServer = new RemoteServerAdapter();
await remoteServer.handleAction('player-1', 'armory'); // Makes Supabase call
```

---

## Testing Strategy

### Unit Tests
**Core Logic (src/Core/)**:
- `GameLogic.test.ts` - Test all game rules in isolation
  - Encounter generation
  - Shop generation  
  - Enemy team scaling
  - Phase transitions
- `SessionManager.test.ts` - Test session CRUD
- `PhaseTransitions.test.ts` - Test phase flow

**Adapters**:
- `LocalServerAdapter.test.ts` - Test full game loop locally
- `RemoteServerAdapter.test.ts` - Mock Supabase calls

### Integration Tests
**Server Parity**:
```typescript
// Verify local and remote servers behave identically
describe('Server Parity', () => {
  it('should generate same encounters with same seed', async () => {
    const localServer = new LocalServerAdapter();
    const remoteServer = new RemoteServerAdapter();
    
    // Create sessions with same seed
    await localServer.createSession('p1', 'crystal_core');
    await remoteServer.createSession('p2', 'crystal_core');
    
    const localOptions = await localServer.getPhaseOptions('p1');
    const remoteOptions = await remoteServer.getPhaseOptions('p2');
    
    expect(localOptions).toEqual(remoteOptions);
  });
});
```

**End-to-End**:
- Playwright tests should pass unchanged
- Run through full game in both modes
- Verify saves/loads work in both modes

### Migration Testing Checklist
- [ ] All existing unit tests still pass
- [ ] All existing E2E tests still pass
- [ ] New Core logic tests written and passing
- [ ] Single-player mode plays identically to before
- [ ] Multiplayer mode unchanged
- [ ] Can switch between modes seamlessly
- [ ] No performance regression
- [ ] No new Phaser imports in Core/

---

## Implementation Phases - Quick Reference

### Phase 1: Extract Core ⭐ START HERE
1. Create `src/Core/Types.ts`
2. Create `src/Core/GameLogic.ts` (copy from MultiplayerLogic)
3. Create `src/Core/SessionManager.ts`
4. Create `src/Core/PhaseTransitions.ts`
5. Validate: No Phaser imports in Core

**Time Estimate**: 4-8 hours  
**Risk**: Low (additive only, no breaking changes yet)

### Phase 2: Local Server Adapter
1. Create `src/Core/IGameServer.ts`
2. Create `src/Core/LocalServerAdapter.ts`
3. Create `src/Core/RemoteServerAdapter.ts`
4. Update `MultiplayerServerManager` to implement interface
5. Write adapter tests

**Time Estimate**: 6-10 hours  
**Risk**: Low (new code, doesn't affect existing systems)

### Phase 3: Refactor Client
1. Create `src/Core/ServerFactory.ts`
2. Update `PhaseManager.startPhase()` - use server
3. Update `Encounter.open()` - remove logic
4. Update `HeroShop.openHeroShop()` - remove logic
5. Update `CombatPhase` - use server enemy teams
6. Delete `MultiplayerPhaseManager.ts`

**Time Estimate**: 10-16 hours  
**Risk**: High (major refactor, extensive testing needed)

### Phase 4: Clean Up
1. Delete deprecated files
2. Update imports
3. Run linter and fix
4. Performance profiling
5. Final testing

**Time Estimate**: 4-6 hours  
**Risk**: Low (polish and optimization)

**Total Estimate**: 24-40 hours across 2-4 weeks

---

## Benefits After Completion

### For Development
✅ **Single Source of Truth**: Game logic in one place  
✅ **Easier Testing**: Core logic testable without Phaser  
✅ **Faster Iteration**: Change logic once, works everywhere  
✅ **Better TypeScript**: Proper separation of concerns  
✅ **Cleaner Diffs**: Logic changes separate from UI changes  

### For Features
✅ **New Modes Easy**: Can add new game modes using same logic  
✅ **AI Players**: Core logic can run AI players easily  
✅ **Replay System**: Sessions are data, can be replayed  
✅ **Spectator Mode**: Can render game from session state  
✅ **Save/Load**: Session data is serializable  

### For Multiplayer
✅ **Consistent Rules**: SP and MP guaranteed same behavior  
✅ **Offline Mode**: Can play MP games offline (local adapter)  
✅ **Server Migration**: Can move from Supabase to other backend  
✅ **Version Control**: Logic versions tracked separately from client  

---

## Known Challenges & Solutions

### Challenge 1: State vs Session Mismatch
**Problem**: Current single-player uses `State` object, multiplayer uses `SessionData`.

**Solution**: 
- Keep both for now during migration
- Core logic works with `SessionData`
- Add conversion utilities: `stateToSession()` and `sessionToState()`
- Long-term: Migrate single-player state to session format

### Challenge 2: Phaser-Dependent Models
**Problem**: Some model files import Phaser (e.g., `Geometry.ts` has `Phaser.Math`).

**Solution**:
- Create `ServerGeometry.ts` with pure implementations (already exists!)
- Core uses `ServerGeometry`, client uses `Geometry`
- Eventually unify once all Phaser deps removed from models

### Challenge 3: Random Number Generation
**Problem**: Need deterministic RNG for both modes with same seed.

**Solution**:
- Already solved: `Utils/Random.ts` has `setSeed()` and pure RNG
- Core uses this exclusively
- Both adapters set seed before simulation

### Challenge 4: Testing Without Phaser
**Problem**: Jest can't import Phaser modules.

**Solution**:
- Core code has zero Phaser deps, tests run in Node.js
- Use existing `MockPhaser.ts` for UI tests
- Adapter tests don't need Phaser

---

## References

### Related Documentation
- [Combat Architecture](./combat-architecture.md) - Reference for pure logic pattern
- [Server-Side Combat Migration](./server-side-combat-migration.md) - Completed example
- [Multiplayer Architecture](./multiplayer-architecture.md) - Current MP setup

### Key Files (Before Refactor)
- `src/Multiplayer/MultiplayerLogic.ts` - Source of core logic
- `src/Scenes/Battleground/PhaseManager.ts` - Single-player orchestrator
- `server/MultiplayerServerManager.ts` - Server implementation
- `src/Scenes/Battleground/RunCombatCore.ts` - Pure combat (reference)

### Implementation Patterns
- **Interface Segregation**: Client depends on interface, not implementation
- **Dependency Injection**: Server adapter injected, not hard-coded
- **Command Pattern**: Actions are data (`actionId` + `payload`)
- **State Machine**: Phases transition based on rules in Core

---

## Next Steps for New AI Session

When starting fresh, begin with:

1. **Review this document** - Understand current state and goals
2. **Validate current architecture** - Run existing tests, ensure clean baseline
3. **Start Phase 1** - Extract Core logic incrementally
4. **Test each step** - Don't move to next phase until current is solid
5. **Keep backups** - Git branch for each phase
6. **Document changes** - Update this doc with actual implementation notes

### Suggested First Tasks
```bash
# 1. Create Core directory structure
mkdir -p phaser/src/Core

# 2. Create Types.ts (copy types from MultiplayerLogic)
# 3. Create GameLogic.ts (copy logic from MultiplayerLogic)
# 4. Add unit tests for Core/GameLogic.ts
# 5. Validate: grep -r "phaser" src/Core/
```

### Questions to Ask When Resuming
- What phase are we in?
- What files have been migrated?
- Are tests passing?
- Any blockers or unexpected issues?
- What's the next concrete file to work on?

---

**Good luck with the refactor! This is a solid architectural improvement that will pay dividends long-term.** 🚀

## Progress Log

### January 28, 2026 - Phase 1 Complete
- **Created Core Structure**:
  - `phaser/src/Core/Types.ts`: Consolidated types from MultiplayerLogic (and restored missing definition of `SessionData`).
  - `phaser/src/Core/GameLogic.ts`: Extracted pure game logic from `MultiplayerLogic.ts`.
  - `phaser/src/Core/SessionManager.ts`: Implemented in-memory session management.
  - `phaser/src/Core/PhaseTransitions.ts`: Extracted phase transition logic (using predefined phases pattern).
- **Refactoring Adjustments**:
  - Updated `phaser/src/Multiplayer/MultiplayerLogic.ts` to extend `GameLogic` for backward compatibility.
  - **Fixed Randomness**: Discovered `Random.ts` was refactored to be pure but consumers relied on global state. Restored stateful compatibility layer in `Random.ts`.
