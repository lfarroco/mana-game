import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";


export const handleIncreasePower = (
	log: CombatLogger.IncreasePowerEntry,
	_playbackState: PlaybackState,
) => {
	const powerTarget = state.combatState?.unitById.get(log.targetId);
	if (powerTarget) {
		powerTarget.power += log.amount;
		// TODO: check if the end-combat logs follow this
		if (log.permanent) {
			powerTarget.bonusPower += log.amount;
		}
		ChargeBarDisplay.updateChargeBar(log.targetId);
	}
};

export const handleDecreasePower = (
	log: CombatLogger.DecreasePowerEntry,
	_playbackState: PlaybackState,
) => {
	const affectedUnit = state.combatState?.unitById.get(log.affectedUnitId);
	if (affectedUnit) {
		affectedUnit.power -= log.amount;
		if (log.permanent) {
			affectedUnit.bonusPower -= log.amount;
		}
		ChargeBarDisplay.updateChargeBar(log.affectedUnitId);
	}
};