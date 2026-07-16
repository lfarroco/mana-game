/**
 * Combat Logger
 *
 * Pure data logger for combat simulation. Collects CombatLogEntry objects
 * during simulation with no side effects, callbacks, or visual logic.
 *
 */

import type * as CombatTypes from "@Core/Combat/CombatTypes";

export type CombatLogEntry = {
	type: string;
	/** Combat time in ms since the combat started (auto-stamped by the logger) */
	timeMs: number;
	duration?: number;
	result?: CombatTypes.WaveOutcome;
	sourceId?: string;
	targetId?: string;
	affectedUnitId?: string;
	amount?: number;
	effectDuration?: number;
	permanent?: boolean;
	force?: string;
	life?: number;
	shield?: number;
	regen?: number;
	poison?: number;
	delta?: number;
	damage?: number;
	unitId?: string;
	unitStats?: [string, import("@Systems/CombatStatsTracker").UnitCombatStats][];
	currentCombatStats?: [string, import("@Systems/CombatStatsTracker").CurrentCombatStats][];
};

/**
 * Input type for logging — the timeMs field is auto-stamped by the logger.
 */
export type CombatLogInput = Omit<CombatLogEntry, "timeMs">;

export type CombatLogger = {
	/** Log a combat event with auto-stamped timeMs */
	log: (entry: CombatLogInput) => void;

	/** Set the current combat time in ms (called each frame during simulation) */
	setCurrentTimeMs: (timeMs: number) => void;

	/** Get all collected logs */
	getLogs: () => CombatLogEntry[];
};

export const createCombatLogger = (): CombatLogger => {
	let currentTimeMs = 0;
	const logs: CombatLogEntry[] = [];

	return {
		log: (entry: CombatLogInput) => {
			logs.push({
				...entry,
				timeMs: currentTimeMs,
			});
		},

		setCurrentTimeMs: (timeMs: number) => {
			currentTimeMs = timeMs;
		},

		getLogs: () => logs,
	};
};