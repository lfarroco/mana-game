/**
 * Combat State Wire Codec
 *
 * Converts between the in-memory CombatState (which contains non-JSON-safe
 * Maps and derived fields) and a plain JSON-safe DTO suitable for HTTP
 * transport between the game server and client.
 *
 * The server serializes after combat; the client deserializes and rebuilds
 * the derived fields. The game server sends a log-free DTO (logs are
 * reconstructible from `seed` + `units` via CombatReplay) — this codec keeps
 * the logs when a local caller needs the full playback payload.
 */

import * as Models from "../Models";
import type { CombatLogEntry } from "./CombatLogger";
import { rebuildCombatStateIndexes } from "./CombatStateIndexes";

/**
 * JSON-safe transport representation of a CombatState.
 *
 * Only carries the source data: initial units, logs, outcome, and
 * final player state. Derived indexes (Map, filtered arrays) are
 * rebuilt on the receiving end.
 */
export type CombatStateDto = {
  /** Snapshot of all units at combat start — playback begins from these. */
  units: readonly Models.Unit[];
  /**
   * Playback timeline. The game server always sends `[]` (the client rebuilds
   * it from `seed` + `units`); local callers may carry the full array.
   */
  logs: CombatLogEntry[];
  /**
   * The pre-combat RNG seed. The client re-runs the deterministic simulation
   * with this seed + `units` to rebuild `logs` locally, so the log array does
   * not need to cross the wire (or be stored).
   */
  seed?: string;
  wonCombat: boolean;
  finalPlayerUnits: Models.Unit[];
  enemyPlayerName: string;
};

/**
 * Encode a CombatState into a JSON-safe DTO for wire transport.
 *
 * Strips the derived Map and computed fields; only carries source data.
 */
export function serializeCombatState(
  state: Models.CombatState,
): CombatStateDto {
  return {
    units: state.initialUnits,
    logs: state.logs,
    seed: state.seed,
    wonCombat: state.wonCombat,
    finalPlayerUnits: state.finalPlayerUnits,
    enemyPlayerName: state.enemyPlayerName,
  };
}

/**
 * Decode a CombatStateDto back into a full CombatState, rebuilding
 * the unitById Map and derived fields (playerCore, cpuCore,
 * playerUnits, cpuUnits).
 */
export function deserializeCombatState(
  dto: CombatStateDto,
): Models.CombatState {
  const units: Models.Unit[] = structuredClone([...dto.units]);

  return rebuildCombatStateIndexes(
    {
      units,
      logs: dto.logs,
      seed: dto.seed,
      enemyPlayerName: dto.enemyPlayerName,
      wonCombat: dto.wonCombat,
      finalPlayerUnits: dto.finalPlayerUnits,
      initialUnits: dto.units,
      unitById: new Map(),
      playerCore: units[0],
      cpuCore: units[0],
      playerUnits: [],
      cpuUnits: [],
    },
    dto.finalPlayerUnits[0]?.force,
  );
}
