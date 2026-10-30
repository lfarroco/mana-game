/**
 * Seed-based combat replay.
 *
 * Combat is deterministic: `simulateCombat` is a pure function of the
 * pre-combat seed plus the initial unit snapshot. That means the log array —
 * the largest part of a combat payload — never has to be stored or sent: the
 * receiver can rebuild it locally from `CombatState.seed` + `initialUnits`.
 *
 * The server still simulates combat to decide the authoritative outcome; this
 * module only reconstructs the playback timeline from the same inputs.
 */

import type { CombatState, SessionData } from "../Models";
import type { CombatLogEntry } from "./CombatLogger";
import { rebuildCombatStateIndexes } from "./CombatStateIndexes";
import { simulateCombat } from "./CombatSimulation";

/**
 * Re-run a fight from its pre-combat seed and initial units, returning the
 * same logs the server produced.
 *
 * Returns `[]` when the state predates the `seed` field (or has no units), so
 * callers can fall back to a log-free result screen. The input state is never
 * mutated; the rebuilt simulation runs on clones.
 */
export function reconstructCombatLogs(state: CombatState): CombatLogEntry[] {
  // Already has a timeline (single-player live state, or a previous replay).
  if (state.logs.length > 0) return state.logs;
  if (!state.seed || state.initialUnits.length === 0) return [];

  const units = structuredClone([...state.initialUnits]);
  const playerForce =
    state.finalPlayerUnits[0]?.force ??
    state.playerCore?.force ??
    units[0]?.force;
  if (!playerForce) return [];

  // Rebuild the same starting shape createCombatState produces: `units` is a
  // mutable clone of the pristine snapshot, and `finalPlayerUnits` aliases
  // those clones (the simulation may mutate them, but only the logs matter
  // here). Derived indexes must point at the clones, not the stored units.
  const simulationState = rebuildCombatStateIndexes(
    {
      ...state,
      units,
      logs: [],
      wonCombat: false,
      finalPlayerUnits: units.filter((u) => u.force === playerForce),
      unitById: new Map(),
      playerCore: units[0],
      cpuCore: units[0],
      playerUnits: [],
      cpuUnits: [],
    },
    playerForce,
  );
  if (!simulationState.playerCore || !simulationState.cpuCore) return [];

  const simulated = simulateCombat(
    {
      seed: state.seed,
      // CombatStatsTracker.stop reads the player's team at the end of the
      // simulation to fold per-fight stats into the run totals.
      team: { units: units.filter((u) => u.force === playerForce) },
    } as SessionData,
    simulationState,
  );

  // A mismatch means the client's core content/version diverged from the
  // server's. Playback is still the best available timeline; the authoritative
  // result stays `state.wonCombat`.
  if (simulated.wonCombat !== state.wonCombat) {
    console.warn(
      "CombatReplay",
      `Reconstructed outcome (${simulated.wonCombat}) disagrees with the server's (${state.wonCombat}); check client/server core version skew.`,
    );
  }

  return simulated.logs;
}
