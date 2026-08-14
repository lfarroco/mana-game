# Battle System

The battle system drives the core game loop on the 3x3 board: phase
orchestration, unit positioning, and combat execution.

## Phases

A run cycles through phases: **Encounter** (fight/shop/upgrade choices),
**Shop** (recruit units), **Orb Shop** (apply orbs), **core upgrades**
(`upgrade_core` / `add_reaction_core`), **Combat**, plus terminal
**Victory** / **Game Over** phases.

Phase orchestration lives in `phaser/src/Screens/Battleground/`:

- `BattlegroundScreen.ts` — owns the phase loop. Each phase is described by a
  local `PhaseHandler` and wired through the `phaseHandlers` registry.
- `Phases/<Phase>/handle<Phase>Phase.ts` — one module per phase (Encounter,
  Shop, OrbShop, UpgradeCore, AddReactionCore, Combat, Victory, GameOver)
  that renders the phase UI and dispatches player actions.

Phase transitions and option generation are **not** decided in the client:
handlers call the server adapter — `getServer()` in `phaser/src/GameServer.ts`
(`LocalServer` in-process for single-player) — which applies the action
through `core/` (`SessionManagement` + `session/SessionTransitions`) and
returns the next session state.

## Board

- Rendering: `phaser/src/Components/Board/Board.ts` — 3x3 slots for the
  player and enemy boards, drop zones, enemy-board visibility, energy-slot
  shaders.
- Rules: `core/src/BoardLogic.ts` (+ `core/src/board/`) — pure functions such
  as `getEmptySlot`, `findFreeSlot`, `checkMove`, `createGrid`.

## Units (Chara system)

`phaser/src/Components/Chara/` manages the visual representation of units:

- `Chara.ts` — container lifecycle, summon, destroy.
- `input.ts` — drag-and-drop placement, click interactions.
- `PowerDisplay.ts`, `ChargeBarDisplay.ts`, `RankDisplay.ts`,
  `CharaTooltip.ts` — live stat displays.
- `Animations/` — summon effects, damage popups, etc.

## Combat execution

1. The session transition into combat triggers `simulateCombat()` in `core/` —
   the fight is resolved deterministically, producing typed combat logs (see
   [combat-architecture.md](combat-architecture.md)).
2. `Phases/Combat/handleCombatPhase.ts` summons both boards and starts
   playback.
3. `Phases/Combat/CombatPlaybackController.ts` plays the logs back through
   `logHandlers/` (visuals in `phaser/src/FX/`, audio via `env.audio`).
4. When playback finishes, `end_combat` is dispatched and the run continues
   to the next phase (or to Victory / Game Over).

## Key concepts

### Board positions

- 3x3 grid (positions 0,0 to 2,2); player board at the bottom, enemy board
  at the top (visually flipped).

> **Design note — positional depth is underexploited.** Card designs currently
> use position primarily as a reaction cost multiplier, but the grid can carry
> more design weight: adjacency bonuses, front/back-row roles, positional
> threats. See [card-design-philosophy.md](card-design-philosophy.md) §3.3 and
> [card-system-risks-and-roadmap.md](card-system-risks-and-roadmap.md) §4.

### State flow

- Client state lives in `env.state` (`phaser/src/Env.ts`); the authoritative
  session snapshot comes from the server adapter after each action.
- UI updates are event-driven via typed events (`phaser/src/Events.ts` plus
  per-screen events) — see [framework-formalization.md](framework-formalization.md).
