import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/CombatLogger";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";


export const handleHasteEnd = (
	log: CombatLogger.HasteEndEntry,
	_playbackState: PlaybackState,
) => {
	const target = state.battleData.units.find((u) => u.id === log.unitId)!;
	target.hasted = 0;
	ChargeBarDisplay.updateChargeBar(log.unitId);
};

export const handleSlowEnd = (
	log: CombatLogger.SlowEndEntry,
	_playbackState: PlaybackState,
) => {
	const target = state.battleData.units.find((u) => u.id === log.unitId)!;
	target.slowed = 0;
	ChargeBarDisplay.updateChargeBar(log.unitId);
};