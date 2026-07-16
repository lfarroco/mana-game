import type { LogHandler } from "./types";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";

export const handleCrystalLife: LogHandler = (log, playbackState) => {
	if (!log.force || log.life === undefined) return;
	ForceStats.updateLifeDisplay(
		log.force,
		log.life,
		0,
		playbackState.combatStates.forceStatsState
	);
};

export const handleLifeDisplay: LogHandler = (log, playbackState) => {
	if (!log.force || log.life === undefined || log.delta === undefined) return;
	ForceStats.updateLifeDisplay(
		log.force,
		log.life,
		log.delta,
		playbackState.combatStates.forceStatsState
	);
};

export const handleShieldDisplay: LogHandler = (log, playbackState) => {
	if (!log.force || log.shield === undefined || log.delta === undefined) return;
	ForceStats.updateShieldDisplay(
		log.force,
		log.shield,
		log.delta,
		playbackState.combatStates.forceStatsState
	);
};

export const handleRegenDisplay: LogHandler = (log, _playbackState) => {
	if (!log.force || log.regen === undefined || log.delta === undefined) return;
	ForceStats.updateRegenDisplay(log.force, log.regen, log.delta);
};

export const handlePoisonDisplay: LogHandler = (log, _playbackState) => {
	if (!log.force || log.poison === undefined || log.delta === undefined) return;
	ForceStats.updatePoisonDisplay(log.force, log.poison, log.delta);
};