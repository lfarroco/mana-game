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

/**
 * JSON-safe transport representation of a CombatState.
 *
 * Only carries the source data: initial units, logs, outcome, and
 * final player state. Derived indexes (Map, filtered arrays) are
 * rebuilt on the receiving end.
 */
export type CombatStateDto = {
	/** Snapshot of all units at combat start — playback begins from these. */
	units: Models.Unit[];
	logs: Models.CombatLogEntry[];
	wonCombat: boolean;
	finalPlayerUnits: Models.Unit[];
	enemyPlayerName: string;
};

/**
 * Encode a CombatState into a JSON-safe DTO for wire transport.
 *
 * Strips the derived Map and computed fields; only carries source data.
 */
export function serializeCombatState(state: Models.CombatState): CombatStateDto {
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
export function deserializeCombatState(dto: CombatStateDto): Models.CombatState {
	const units = structuredClone(dto.units);
	const unitById = new Map(units.map((u) => [u.id, u]));

	const playerCore = units.find((u) => u.isCore && u.force === dto.finalPlayerUnits[0]?.force)!;
	const cpuCore = units.find((u) => u.isCore && u.force !== dto.finalPlayerUnits[0]?.force)!;

	return {
		units,
		logs: dto.logs,
		enemyPlayerName: dto.enemyPlayerName,
		wonCombat: dto.wonCombat,
		finalPlayerUnits: dto.finalPlayerUnits,
		initialUnits: dto.units,
		unitById,
		playerCore,
		cpuCore,
		playerUnits: units.filter((u) => u.force === playerCore.force),
		cpuUnits: units.filter((u) => u.force === cpuCore.force),
	};
}
