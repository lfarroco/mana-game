/**
 * Combat Logger
 *
 * Pure data logger for combat simulation. Collects CombatLogEntry objects
 * during simulation with no side effects, callbacks, or visual logic.
 *
 * This replaces the role that ServerCombatEffects played for logging,
 * separating the concerns of "log what happened" from "play back visuals."
 */

import type { WaveOutcome } from "@Core/Combat/CombatTypes";

export type CombatLogEntry = {
	type: string;
	frame: number;
	duration?: number;
	result?: WaveOutcome;
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
	delayed?: number;
	applyTime?: number;
};

export type CombatLogger = {
	/** Log a combat event */
	log: (entry: CombatLogEntry) => void;

	/** Set the current frame number (called each frame during simulation) */
	setFrame: (frame: number) => void;

	/** Get the current frame number */
	getCurrentFrame: () => number;

	/** Get all collected logs */
	getLogs: () => CombatLogEntry[];
};

/**
 * Create a new CombatLogger.
 * @param frameDurationMs - The duration of one frame in ms (default: 16.67)
 */
export const createCombatLogger = (_frameDurationMs: number = 16.67): CombatLogger => {
	let currentFrame = 0;
	const logs: CombatLogEntry[] = [];

	return {
		log: (entry: CombatLogEntry) => {
			logs.push(entry);
		},

		setFrame: (frame: number) => {
			currentFrame = frame;
		},

		getCurrentFrame: () => currentFrame,

		getLogs: () => logs,
	};
};