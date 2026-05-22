# Effect System

The Effect System is the visual feedback layer for combat events in Mana Battle.

It converts combat log events into Phaser-based animations and particle effects while keeping combat resolution deterministic in core logic.

## Architecture Overview

Core pipeline:

1. Server or local combat simulation produces combat logs.
2. `CombatPlaybackController` schedules and executes log entries over time.
3. `BrowserCombatEffects` maps each log type to concrete visual handlers.
4. Reusable effect functions in `phaser/src/Effects/` and `phaser/src/TriggerSystem/effects/visuals/` render projectiles, bursts, and status visuals.

Primary files:

- `phaser/src/Client/Scenes/Battleground/CombatPlaybackController.ts`
- `phaser/src/Client/Scenes/Battleground/BrowserCombatEffects.ts`
- `phaser/src/Effects/`
- `phaser/src/TriggerSystem/effects/visuals/`

## Playback Integration

`CombatPlaybackController` consumes `CombatLogEntry[]` and schedules animations by frame time.

For each log type (`damage`, `heal`, `shield`, `poison`, `regen`, `haste`, `slow`, `charge`, etc.) it calls the corresponding callback on the `CombatEffects` interface.

This keeps responsibilities split:

- Simulation determines what happened.
- Playback determines when to show it.
- Effect modules determine how it looks.

## Browser Effect Mapping

`createBrowserCombatEffects()` provides runtime handlers used in normal client rendering.

Examples:

- `onDamage` uses `damageFx(...)` and target shake.
- `onHeal` uses `healFx(...)`.
- `onShield` uses `shieldFx(...)`.
- `onPoison` uses `poisonFx(...)`.
- `onRegen`, `onHaste`, `onSlow`, and `onCharge` use `arcaneMissileTargeted(...)` with specialized color/effect presets.
- `onReactionVisual` uses `summonEffect(...)`.

Audio feedback is coupled at this layer via `playSoundEffect(...)` so visuals and SFX remain synchronized.

## Effect Modules

`phaser/src/Effects/` contains reusable Phaser effect builders, for example:

- `arcaneMissile.ts`, `arcaneMissileTargeted.ts`
- `fireballEffect.ts`, `explodeEffect.ts`, `impactEffect.ts`
- `hasteEffect.ts`, `slowEffect.ts`, `healingHitEffect.ts`
- `summonEffect.ts`, `EnergyBeam.ts`, `GlowingOrb.ts`

`phaser/src/Effects/index.ts` re-exports the public effect API used by other systems.

`phaser/src/Effects/effectConstants.ts` centralizes shared constants such as impact offsets.

## Trigger Visual Adapters

`phaser/src/TriggerSystem/effects/visuals/` wraps generic effect primitives into semantic helpers:

- `damage.ts`
- `heal.ts`
- `shield.ts`
- `poison.ts`
- `regen.ts`

These helpers standardize styling presets (colors, amplitude, impact tuning) and make gameplay code read in domain terms.

## Design Guidelines

When adding a new visual effect:

1. Implement or reuse a primitive in `phaser/src/Effects/`.
2. Add a semantic adapter in `TriggerSystem/effects/visuals/` if it maps to a gameplay effect.
3. Wire the handler in `BrowserCombatEffects` via the `CombatEffects` callback surface.
4. Ensure corresponding combat log entries are emitted by simulation.
5. Keep simulation logic side-effect free; visuals should only read event data.

## Performance Notes

- Effects are instantiated from log playback timing, not per-frame polling of game rules.
- Shared constants and helper modules reduce duplicated object setup.
- Heavy combat scenes should prefer short-lived particle emitters with explicit destroy/cleanup patterns.
