/**
 * Combat State Wire Codec
 *
 * Converts between the in-memory CombatState (which contains non-JSON-safe
 * Maps and derived fields) and a plain JSON-safe DTO suitable for HTTP
 * transport between the game server and client.
 *
 * The server serializes after combat; the client deserializes and rebuilds
 * the derived fields for playback.
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
  logs: CombatLogEntry[];
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
