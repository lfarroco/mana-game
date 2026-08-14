import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import { applyLogEntryToCombatState } from "@game/Combat/applyLogEntryToCombatState";
import * as ChargeBarDisplay from "@Components/Chara/ChargeBarDisplay";
import { getCombatState } from "./combatStateStore";

export const handleHasteEnd = (log: CombatLogger.HasteEndEntry, _playbackState: PlaybackState) => {
	const combatState = getCombatState();
	if (!combatState) return;
	applyLogEntryToCombatState(combatState, log);
	ChargeBarDisplay.updateChargeBar(log.unitId);
};

export const handleSlowEnd = (log: CombatLogger.SlowEndEntry, _playbackState: PlaybackState) => {
	const combatState = getCombatState();
	if (!combatState) return;
	applyLogEntryToCombatState(combatState, log);
	ChargeBarDisplay.updateChargeBar(log.unitId);
};
