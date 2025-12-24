# Server-Side Combat Migration Guide

This document outlines the plan and necessary steps to enable the combat system to run in a headless server environment (e.g., Node.js) without dependencies on the Phaser game engine.

## Goal

The objective is to split the existing combat runner logic from its visual presentation. The server should be able to run a "pure" simulation of the combat to verify results or determine outcomes, while the client maintains the rich visual experience.

## Architecture Strategy

### 1. Separation of Concerns (Pure Runner vs. IO Runner)
- **`RunCombatPure.ts`**: Contains only the core game logic (stats, damage, cooldowns, outcomes). It must **not** import `Phaser` or any visual systems.
- **`RunCombatIO.ts`**: Handles the "Input/Output" - it initializes the simulation, connects visuals to logic, and manages the game loop on the client side.

### 2. Event-Driven Decoupling
Visual updates should be driven by events rather than direct function calls.
- **`CombatEvents.ts`**: A lightweight, dependency-free Event Emitter shared by both runners.
- **Systems Refactor**: Game systems (Poison, Regen, etc.) should emit events (e.g., `'poison_update'`, `'timeout_tick'`) instead of directly manipulating UI elements.
- **Listeners**: `RunCombatIO` (the client) listens to these events and triggers the appropriate visual effects (e.g., floating text, bar updates). The server simply ignores them.

### 3. Dependency Injection for Timing
- The server uses `setTimeout` or a game tick loop, while Phaser uses its own `Scene.time`.
- Inject a `delay` function into systems like `TriggerSystem` so they can pause execution in a way that respects the environment (server vs. client).

## Implementation Checklist

### Core Setup
- [ ] **Create `RunCombatPure.ts`**: A copy of `RunCombatIO.ts` stripped of all visual code (animations, ChargeBarDisplay, Phaser imports).
- [ ] **Create `CombatEvents.ts`**: A simple `EventEmitter` class to broadcast game state changes.

### System Decoupling
Refactor the following systems to remove direct dependencies on `ForceStats.ts` or `Chara.ts`:
- [ ] **`PoisonDamageSystem.ts`**: Emit `'poison_update'` instead of calling `updatePoisonDisplay`.
- [ ] **`RegenSystem.ts`**: Emit `'regen_update'` instead of calling `updateRegenDisplay`.
- [ ] **`StatusEffectSystem.ts`**: Remove `Phaser.Time.TimerEvent`. Implement a manual `update(delta)` method that `RunCombatPure` calls out explicitly.
- [ ] **`TimeoutDamageSystem.ts`**: Separate the visual "Shooting Star" projectile from the logic. Apply damage directly in the system and emit `'timeout_tick'` for the client to spawn the star.
- [ ] **`TriggerSystem.ts`**:
    - Remove calls to `summonEffect` and `getCharaById`.
    - Emit `'summon_effect'` event for visual spawns.
    - Inject the `delay` function to avoid importing Phaser's `delay` utility.

### Client Integration (`RunCombatIO.ts`)
- [ ] Subscribe to all `CombatEvents` (`poison_update`, `summon_effect`, etc.).
- [ ] Call the appropriate visual functions (`updatePoisonDisplay`, `summonEffect`) in response to events.
- [ ] Inject the Phaser-based `delay` into `TriggerSystem`.

### Verification
- [ ] Create a `verify_pure.ts` script that imports `RunCombatPure.ts` in a raw Node.js process to ensure no `Phaser` or DOM-related errors occur.
