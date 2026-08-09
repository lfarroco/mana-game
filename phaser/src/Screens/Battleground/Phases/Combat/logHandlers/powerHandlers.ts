import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as ChargeBarDisplay from "@Components/Chara/ChargeBarDisplay";
import * as PowerDisplay from "@Components/Chara/PowerDisplay";
import { getCombatState } from "./combatStateStore";

export const handleIncreasePower = (
	log: CombatLogger.IncreasePowerEntry,
	_playbackState: PlaybackState
) => {
	const powerTarget = getCombatState()?.unitById.get(log.targetId);
	if (powerTarget) {
		powerTarget.power += log.amount;
		// TODO: verify that end-of-combat finalUnit powers (which carry permanent bonuses
		// back to the session) are correctly propagated — bonusPower mutations during playback
		// must match the server-side results exactly.
		if (log.permanent) {
			powerTarget.bonusPower += log.amount;
		}
		ChargeBarDisplay.updateChargeBar(log.targetId);
		PowerDisplay.updatePowerDisplay(log.targetId);
	}
};

export const handleDecreasePower = (
	log: CombatLogger.DecreasePowerEntry,
	_playbackState: PlaybackState
) => {
	const affectedUnit = getCombatState()?.unitById.get(log.affectedUnitId);
	if (affectedUnit) {
		affectedUnit.power -= log.amount;
		if (log.permanent) {
			affectedUnit.bonusPower -= log.amount;
		}
		ChargeBarDisplay.updateChargeBar(log.affectedUnitId);
		PowerDisplay.updatePowerDisplay(log.affectedUnitId);
	}
};
