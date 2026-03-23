import type { ForceStatsState } from "@Scenes/Battleground/ForceStats";

export function initializeForceStatsState(): ForceStatsState {
	return {
		playerStats: null,
		cpuStats: null,
		healthBars: new Map(),
		shieldBars: new Map(),
	} as ForceStatsState;
}