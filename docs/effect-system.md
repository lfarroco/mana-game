# Effect System

The effect system is the visual feedback layer for combat events. It converts
typed combat log entries into Phaser animations while combat resolution stays
deterministic in `core/`.

## Pipeline

1. `core/` simulation produces `CombatLogEntry[]` (see
   [combat-architecture.md](combat-architecture.md)).
2. `Screens/Battleground/Phases/Combat/CombatPlaybackController.ts` schedules
   the log entries over time.
3. `Screens/Battleground/Phases/Combat/logHandlers/` maps each log type to
   concrete visual handlers:
   - `projectileHandlers.ts` — damage / heal / shield style projectiles
   - `statusHandlers.ts` — poison, regen, haste, slow, charge
   - `powerHandlers.ts` — power increases / decreases / multipliers
   - `arcaneMissileHandlers.ts`, `combatStatsHandlers.ts`, plus `index.ts`
     (dispatch), `types.ts`, `combatStateStore.ts`
4. Styling adapters in `logHandlers/visuals/` (`damage.ts`, `heal.ts`,
   `shield.ts`, ...) wrap the generic primitives in domain terms (colors,
   amplitude, impact tuning).
5. Reusable Phaser primitives live in `phaser/src/FX/`:
   `arcaneMissileTargeted.ts`, `fireballEffect.ts`, `explodeEffect.ts`,
   `impactEffect.ts`, `hasteEffect.ts`, `slowEffect.ts`,
   `healingHitEffect.ts`, `summonEffect.ts`, `EnergyBeam.ts`,
   `GlowingOrb.ts`, re-exported via `FX/index.ts`.

Responsibilities stay split: simulation decides **what** happened, playback
decides **when** to show it, effect modules decide **how** it looks.

## Audio

SFX are coupled at the handler layer (`env.audio` / `AudioManager`) so
visuals and sound stay synchronized — see
[audio-system.md](audio-system.md).

## Adding a new visual effect

1. Implement or reuse a primitive in `phaser/src/FX/`.
2. Add a styling adapter in `logHandlers/visuals/` if it maps to a gameplay
   effect.
3. Wire the handler for the corresponding log type in `logHandlers/`.
4. Ensure the simulation emits the log entry — visuals only read event data,
   never mutate game state.

## Performance notes

- Effects fire from playback timing, not per-frame polling of game rules.
- Prefer short-lived particle emitters with explicit destroy/cleanup.
- See [combat-playback-performance.md](combat-playback-performance.md) for
  known frame-spike optimizations.
