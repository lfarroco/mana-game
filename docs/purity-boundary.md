# Purity Boundary & Replay-Critical Import Rules

_Last updated: March 23, 2026_

This document defines the architectural boundary between pure game logic and presentation/integration layers. It serves as a guide for maintaining deterministic replays and enabling replay execution in edge computing environments like Supabase Edge Functions.

## Overview

Mana Battle's game logic is organized into **pure** (framework-agnostic) and **impure** (Phaser-dependent) layers. The pure layer executes deterministically in any environment (Node.js, Deno, Edge Functions, tests) without requiring Phaser or browser APIs at runtime.

### Why This Matters

1. **Deterministic Replays**: Pure logic guarantees identical results given the same inputs, enabling server-side replay in Supabase Edge Functions.
2. **Portability**: Core game logic can run on any platform without platform-specific dependencies.
3. **Type Safety**: Type-only imports of Phaser are acceptable; actual Phaser API calls are not.
4. **Bundle Size**: Pure core logic remains lightweight (no scene graphs, no graphics).

---

## Folder Organization

### ✅ Pure Folders (No Runtime Phaser Usage)

These folders contain framework-agnostic logic and must have zero runtime Phaser dependencies:

| Folder                 | Purpose                                                                  | Phaser Usage           |
|------------------------|--------------------------------------------------------------------------|------------------------|
| **src/Core/**          | Game logic orchestration, session management, combat simulation, replays | Type-only imports only |
| **src/Models/**        | Data models (Unit, Card, State, Board)                                   | Type-only imports only |
| **src/TriggerSystem/** | Action-Reaction effect engine                                            | Type-only imports only |

**Verification**: `npm run test` passes without Phaser runtime mocks. Replay bundle (`replay-commit/_shared.js`) contains no Phaser constructor calls.

### 🎨 Impure Folders (Phaser Integration)

These folders provide visual effects, scene management, and UI rendering using Phaser:

| Folder                 | Purpose                            | Phaser Usage    |
|------------------------|------------------------------------|-----------------|
| **src/Engine/Scenes/** | Phaser scenes, scene orchestration | Full Phaser API |
| **src/Systems/**       | Visual effects, audio, UI systems  | Full Phaser API |
| **src/Effects/**       | Particle effects, animations       | Full Phaser API |
| **src/UI/**            | UI components and interactions     | Full Phaser API |

**Note**: These folders can import from pure folders, but the reverse is forbidden.

---

## Replay-Critical Import Rules

### ✅ Allowed in Pure Folders (src/Core/, src/Models/, src/TriggerSystem/)

1. **Type-only Phaser imports**:
   ```typescript
   import type Phaser from "phaser";
   import type { Scene } from "phaser";
   ```
   Used for type annotations in interfaces (e.g., `CombatEffects.getScene(): Phaser.Scene | null`).

2. **Relative imports within pure folders**:
   ```typescript
   import { createServerCombatEffects } from "@Core/Combat/ServerCombatEffects";
   import { Unit } from "@Models/Entities/Unit";
   ```

3. **Data utilities**:
   ```typescript
   import { BaseCollection } from "@Data/BaseCollection";
   ```

4. **Standard library and external packages** (framework-agnostic):
   ```typescript
   import { TypeOf } from "ts-pattern";
   import seedrandom from "seedrandom";
   ```

### ❌ Forbidden in Pure Folders

1. **Runtime Phaser imports or API calls**:
   ```typescript
   // ❌ FORBIDDEN
   import * as Phaser from "phaser";
   const scene = new Phaser.Scene();
   console.log(Phaser.VERSION);
   ```

2. **Importing from impure layers**:
   ```typescript
   // ❌ FORBIDDEN
   import { AudioManager } from "@Systems/AudioManager";
   import { WalletScene } from "@Engine/Scenes/WalletScene";
   ```

3. **Direct dependencies on browser/Node APIs that aren't polyfilled**:
   ```typescript
   // ❌ FORBIDDEN (unless polyfilled in bundle-edge.ts)
   import { steamworks } from "steam-user";
   ```

### Type Annotations Referencing Phaser

Phaser types can appear in Core interfaces, but only as optional return slots or parameters that callers fill in. The Core logic itself never instantiates or calls into them:

```typescript
// ✅ ALLOWED: Type annotation for injection point
export type CombatEffects = {
  getScene: () => Phaser.Scene | null;  // Type only, never called by Core
  onUnitPop: (unitId: string) => void;  // Pure callback
};

// ✅ ALLOWED: ForceStatsState holds Phaser objects but is never created by Core
export type ForceStatsState = {
  playerStats: Phaser.GameObjects.Container | null;  // Type placeholder
  // ...
};

// ✅ In Core, we initialize it as empty (no Phaser instantiation):
export function initializeForceStatsState(): ForceStatsState {
  return {
    playerStats: null,  // Not a Phaser object, just null
    healthBars: new Map(),  // Plain JS Map, no Phaser
  };
}
```

---

## Verification Checklist for Contributors

Before committing changes to Core, Models, or TriggerSystem:

- [ ] No `import` of non-type Phaser symbols (use `import type` instead)
- [ ] No imports from `@Engine/Scenes/`, `@Systems/`, `@Effects/`
- [ ] No Phaser constructor calls (e.g., `new Phaser.Scene()`, `new Phaser.Vector2()`)
- [ ] No Phaser static method calls (e.g., `Phaser.VERSION`, `Phaser.BlendModes.ADD`)
- [ ] No calls to browser-only APIs (`fetch`, `localStorage` direct access, `setTimeout` with async behavior)
- [ ] Tests pass with `npm test` (determinism verified)
- [ ] Linter passes with `npm run lint`
- [ ] Replay tests pass: `npm test -- src/Core/ReplayManifest.test.ts`

### Automated Verification

To verify no runtime Phaser dependencies were introduced:

```bash
# Check for non-type Phaser imports in Core
grep -r "import.*from.*['\"]phaser['\"]" src/Core/ src/Models/ src/TriggerSystem/ \
  | grep -v "import type"

# Should return NO results (or only `import type` lines)
```

---

## Known Type Imports in Core (Intentional)

The following type imports are allowed and intentional:

1. **src/Core/Combat/CombatTypes.ts**
   - `Phaser.Scene` (type annotation for `getScene()` injection point)

2. **src/Core/Combat/ForceStatsState.ts**
   - `Phaser.GameObjects.Container`, `Phaser.GameObjects.Graphics` (type placeholders for UI state)

3. **src/Core/Combat/BlackHoleState.ts**
   - `Phaser.GameObjects.Shader`, `Phaser.Time.TimerEvent` (type placeholders for visual effects)

These exist only to satisfy TypeScript type checking when the engine layer injects Phaser objects. Core itself never instantiates or calls methods on these types.

---

## Example: Adding New Features

### ✅ Adding a pure combat effect

```typescript
// ✅ src/Core/Combat/NewEffect.ts
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";

export function applyFrostEffect(state: State, targets: Unit[]): State {
  // Pure logic: no Phaser, deterministic
  return {
    ...state,
    team: state.team.map(unit =>
      targets.includes(unit)
        ? { ...unit, slowed: true }
        : unit
    )
  };
}

// ✅ Used in Core/Combat/RunCombatCore.ts
import { applyFrostEffect } from "@Core/Combat/NewEffect";
```

### ❌ Trying to add visual effects to Core

```typescript
// ❌ src/Core/Combat/BadVisualEffect.ts
import { FrostParticles } from "@Effects/FrostParticles";  // FORBIDDEN

export function applyFrostEffect(targets: Unit[]): void {
  // Violates purity boundary
  FrostParticles.emit();
}
```

Use a **Phaser effect listener instead** in the impure layer:

```typescript
// ✅ src/Systems/CombatVisuals.ts
import { FrostParticles } from "@Effects/FrostParticles";

export function setupCombatVisuals() {
  phase.events.on("frost_effect", (targets: Unit[]) => {
    FrostParticles.emit();  // Phaser code here is fine
  });
}
```

---

## Replay Execution Guarantee

Any function imported from `src/Core/` can be executed in:
- ✅ Browser (with Phaser)
- ✅ Node.js (with Phaser mocked or stubbed)
- ✅ Supabase Edge Functions (no Phaser)
- ✅ Deno (no Phaser)
- ✅ Unit tests (no Phaser)

This guarantee is maintained by the import rules above. If a Core function fails outside the browser, it's a bug.

---

## Related Documents

- [server-side-combat-migration.md](server-side-combat-migration.md) - How replays are simulated server-side
- [phase-system-refactoring.md](phase-system-refactoring.md) - Phase handler architecture
- [trigger-system.md](trigger-system.md) - Effect engine design
- [single-multiplayer-unification.md](single-multiplayer-unification.md) - Unified server interface
