import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as ChargeBarDisplay from "@Components/Chara/ChargeBarDisplay";
import * as PowerDisplay from "@Components/Chara/PowerDisplay";
import * as Chara from "@Components/Chara/Chara";
import * as Animations from "@Components/Chara/Animations";
import { getCombatState } from "./combatStateStore";

// Where the "+x" pop text spawns, relative to the unit's tile center.  The unit
// sprite is rendered slightly above the tile center, so this sits above the unit.
const POWER_POP_TEXT_Y_OFFSET = 110;

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

		// Show a "+x" pop text over the unit that gained power.
		if (Chara.hasCharaById(log.targetId)) {
			const chara = Chara.mustGetCharaById(log.targetId);
			Animations.popText({
				x: chara.x,
				y: chara.y - POWER_POP_TEXT_Y_OFFSET,
				text: "+" + log.amount,
				type: "power",
			});
		}
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
