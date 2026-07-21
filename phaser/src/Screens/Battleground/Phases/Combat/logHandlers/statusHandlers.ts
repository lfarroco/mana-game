import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import { getCombatState } from "./combatStateStore";


export const handleHasteEnd = (
	log: CombatLogger.HasteEndEntry,
	_playbackState: PlaybackState,
) => {
	const combatState = getCombatState();
	if (!combatState) return;
	const target = combatState.unitById.get(log.unitId)!;
	target.hasted = 0;
	ChargeBarDisplay.updateChargeBar(log.unitId);
};

export const handleSlowEnd = (
	log: CombatLogger.SlowEndEntry,
	_playbackState: PlaybackState,
) => {
	const combatState = getCombatState();
	if (!combatState) return;
	const target = combatState.unitById.get(log.unitId)!;
	target.slowed = 0;
	ChargeBarDisplay.updateChargeBar(log.unitId);
};