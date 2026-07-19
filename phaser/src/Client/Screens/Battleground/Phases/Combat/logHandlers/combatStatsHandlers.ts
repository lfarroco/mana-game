import type * as types from "./types";
import * as CombatLogger from "@game/CombatLogger";

export const handleCombatStats = (
	log: CombatLogger.CombatStatsEntry,
	playbackState: types.PlaybackState,
) => {
	if (playbackState.combatStates.combatStatsTrackerState) {
		playbackState.combatStates.combatStatsTrackerState.unitStats = new Map(log.unitStats);
		playbackState.combatStates.combatStatsTrackerState.currentCombatStats = new Map(
			log.currentCombatStats
		);
	}
};