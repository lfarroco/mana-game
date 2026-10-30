# Combat Architecture

Combat is fully simulated inside the pure `core/` package and then played
back visually by the client. Simulation and presentation never mix.

## Components

### Simulation (`core/`)

- `core/src/Combat/CombatRunner.ts` — the frame-by-frame combat loop:
  cooldowns, effect dispatch through the TriggerSystem, status systems
  (poison, regen, timeout), win/loss detection.
- `core/src/Combat/CombatSimulation.ts` — `simulateCombat()` runs a combat
  to completion and returns the resulting `CombatState` (including the logs
  and `wonCombat`). Deterministic for a given seed.
- `core/src/Combat/CombatLogger.ts` — the typed `CombatLogEntry` union
  (damage, heal, shield, poison, regen, haste, slow, charge, power changes,
  ticks, outcome, ...). Everything the client needs to render the fight.
- `core/src/session/SessionTransitions.ts` — calls `simulateCombat` when a
  session transitions into combat; the resulting `CombatState` carries the
  pre-combat `seed`, the initial units, and the authoritative outcome. The log
  array itself is not stored or sent: the client rebuilds it deterministically
  with `CombatReplay.reconstructCombatLogs`.

### Playback (`phaser/src/`)

- `Screens/Battleground/Phases/Combat/CombatPlaybackController.ts` —
  `createCombatPlaybackController(...)` schedules the log entries on the
  Phaser clock and fires them in order. The combat phase resolves its logs
  first: single-player uses the live array, multiplayer reconstructs it from
  the wire DTO's `seed` + `initialUnits`.
- `Screens/Battleground/Phases/Combat/logHandlers/` — dispatches each log
  type to visuals (`projectileHandlers.ts`, `statusHandlers.ts`,
  `powerHandlers.ts`, `arcaneMissileHandlers.ts`, `combatStatsHandlers.ts`),
  with shared styling adapters in `logHandlers/visuals/`.
- `phaser/src/FX/` — reusable Phaser effect primitives
  (`arcaneMissileTargeted`, `fireballEffect`, `summonEffect`, ...). See
  [effect-system.md](effect-system.md).

## Data flow

```mermaid
sequenceDiagram
    participant Session as SessionTransitions (core)
    participant Sim as simulateCombat (core)
    participant Log as CombatLogger (core)
    participant Play as CombatPlaybackController (client)
    participant FX as logHandlers + FX (client)

    Session->>Sim: combat starts (seeded state)
    Sim->>Log: record every event as typed CombatLogEntry
    Sim-->>Session: CombatState { seed, initialUnits, wonCombat, ... }
    Session-->>Play: wire DTO (logs omitted)
    Play->>Play: reconstructCombatLogs(seed, initialUnits)
    loop Phaser update
        Play->>FX: fire due animations/sounds in log order
    end
    Play->>Session: playback finished -> end_combat
```

## Properties

1. **Deterministic** — same seed and inputs produce the same combat and logs.
2. **Verifiable** — a server can re-run `simulateCombat` and compare outcomes
   (see [game-server.md](game-server.md)).
3. **Reconstructible** — logs are a pure function of the pre-combat seed and
   initial units, so neither storage nor the wire needs to carry them.
4. **Headless** — simulation runs in Node with zero Phaser/DOM imports (see
   [purity-boundary.md](purity-boundary.md)).
