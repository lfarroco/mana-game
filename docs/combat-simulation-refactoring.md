# Combat Simulation Refactoring: Log-Driven Combat

## Current Problem

The `CombatEffects` interface (`Core/Combat/CombatTypes.ts`) is a "god callback" with ~25 methods that is threaded through the entire combat system. Every trigger-system effect handler (like `dealDamageLogicIO`) follows this pattern:

```typescript
// Current pattern in dealDamage.ts:
const effects = env.effects;
if (effects.onDamage) {
  effects.onDamage(sourceUnit.id, enemyCore.id, damage, effect, delayedExecution);
} else {
  effect();  // immediate execution for server-side
}
```

This has several issues:

1. **Mixed concerns**: The same function computes damage AND decides about visual callback timing
2. **Callback pattern**: `effect()` (game state mutation) is passed as a callback to `effects.onDamage()`, meaning the CombatEffects implementation controls **when** game logic runs
3. **Leaky abstraction**: `Force.ts` in the Models layer imports `CombatEffects` to call `updateLifeDisplay()` and `updateShieldDisplay()`
4. **Unnecessary complexity**: Server simulation has a frame scheduler just to delay `onHit` callbacks for visual timing
5. **Monolithic interface**: All 25 methods must be implemented by both server and client, even though the server just logs and the client just plays visuals

## Target Architecture

```
Simulation path:
  simulateCombat(session)
    → creates CombatState, initializes units
    → creates CombatLogger (collects CombatLogEntry[])
    → runs combat loop (logger replaces CombatEffects for logging)
    → returns { finalState, initialUnits, logs: CombatLogEntry[], playerWon }

Client playback path:
  handleCombatPhase()
    → reads combatState.logs from session
    → CombatPlaybackController(logs, VisualEffectFunctions)
    → schedules log entries by applyTime
    → dispatches to visual effects at the right moments
```

### Key Changes

#### 1. New: `CombatLogger` — Pure Data Logger

A minimal utility that collects `CombatLogEntry` objects during simulation. No callbacks, no scheduling, no visual logic.

```typescript
// Core/Combat/CombatLogger.ts
export type CombatLogger = {
  log: (entry: CombatLogEntry) => void;
  setFrame: (frame: number) => void;
  getLogs: () => CombatLogEntry[];
};
```

#### 2. Modified: `CombatEnvironment` — Add Logger

`CombatEnvironment` gains a `logger` field alongside the existing `effects`. This allows migrating one effect at a time:

```typescript
export type CombatEnvironment = {
  state: State.State;
  combatStates: CombatSystemStates.CombatSystemStates;
  effects: CombatEffects;   // ← will be removed after all effects migrated
  logger: CombatLogger;     // ← new: replaces effects for logging
  processReactions: ...;
};
```

#### 3. Modified: Each effect handler (e.g. `dealDamageLogicIO`)

**Before:**
```typescript
const effect = () => {
  // Apply damage to force (mutates state)
  applyDamageToForce(env.state, targetForce, damage, ...);
};
if (effects.onDamage) {
  effects.onDamage(sourceUnit.id, enemyCore.id, damage, effect, delayedExecution);
} else {
  effect();
}
```

**After:**
```typescript
// Apply damage to force immediately (no callback)
applyDamageToForce(env.state, targetForce, damage, ...);

// Log the event for playback
env.logger.log({
  type: "damage",
  frame: env.logger.getCurrentFrame(),
  sourceId: sourceUnit.id,
  targetId: enemyCore.id,
  amount: damage,
  duration: 400,  // visual duration hint
  delayed: delayedExecution,
});
```

#### 4. Modified: `Force.ts` functions

Remove `CombatEffects` parameter from `applyDamageToForce()`, `manipulateCoreLife()`, `manipulateCoreShield()`. If needed, pass a logger to log life/shield display updates separately, or let the calling effect handler log them.

#### 5. Removed (eventually): `ServerCombatEffects.ts`

`ServerCombatEffects` becomes unnecessary once all effects are migrated. Its responsibilities are absorbed by:
- `CombatLogger` for logging
- Immediate in-place execution for game state mutation

## Migration Strategy

Migrate one effect at a time, keeping backward compatibility:

1. Add `CombatLogger` type
2. Add `logger` field to `CombatEnvironment`
3. Create `CombatLogger` instance in `CombatSimulation` and `RunCombatCore`
4. Migrate `dealDamageLogicIO` to use logger instead of `effects.onDamage()`
5. Migrate remaining effects one-by-one (heal, shield, poison, regen, haste, slow, charge, etc.)
6. Once all effects are migrated, remove `CombatEffects` from `CombatEnvironment`
7. Remove `ServerCombatEffects.ts`

## Files Changed

| File | Change |
|------|--------|
| NEW: `Core/Combat/CombatLogger.ts` | Create logger type and implementation |
| MODIFY: `Core/Combat/CombatTypes.ts` | Add `logger` to `CombatEnvironment` |
| MODIFY: `Core/Combat/CombatSimulation.ts` | Create and pass logger |
| MODIFY: `Core/Combat/RunCombatCore.ts` | Create and pass logger |
| MODIFY: `TriggerSystem/effects/dealDamage.ts` | Use logger, remove `effects.onDamage()` |
| MODIFY: `TriggerSystem/effects/*.ts` | Migrate each effect (post-this-task) |
| MODIFY: `Models/Entities/Force.ts` | Remove `CombatEffects` dependency (post-this-task) |
| MODIFY: `Systems/StatusEffectSystem.ts` | Remove `effects` calls (post-this-task) |
| MODIFY: `Systems/TimeoutDamageSystem.ts` | Remove `effects` calls (post-this-task) |
| MODIFY: `Systems/PoisonDamageSystem.ts` | Remove `effects` calls (post-this-task) |
| MODIFY: `Systems/RegenSystem.ts` | Remove `effects` calls (post-this-task) |
| MODIFY: `Client/.../CombatPlaybackController.ts` | Handle migrated log entries |
| MODIFY: `Client/.../BrowserCombatEffects.ts` | Refactor to visual-only (post-this-task) |
| DELETE: `Core/Combat/ServerCombatEffects.ts` | No longer needed (post-this-task) |