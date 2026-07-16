import type { LogHandler } from "./types";

export const handleCombatStats: LogHandler = (log, playbackState) => {
	if (
		playbackState.combatStates.combatStatsTrackerState &&
		log.unitStats &&
		log.currentCombatStats
	) {
		playbackState.combatStates.combatStatsTrackerState.unitStats = new Map(log.unitStats);
		playbackState.combatStates.combatStatsTrackerState.currentCombatStats = new Map(
			log.currentCombatStats
		);
	}
};