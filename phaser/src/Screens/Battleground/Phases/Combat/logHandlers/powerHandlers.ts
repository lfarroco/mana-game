import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import { applyLogEntryToCombatState } from "@game/Combat/applyLogEntryToCombatState";
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
	const combatState = getCombatState();
	if (!combatState) return;
	const powerTarget = combatState.unitById.get(log.targetId);
	if (powerTarget) {
		applyLogEntryToCombatState(combatState, log);
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
	const combatState = getCombatState();
	if (!combatState) return;
	const affectedUnit = combatState.unitById.get(log.affectedUnitId);
	if (affectedUnit) {
		applyLogEntryToCombatState(combatState, log);
		ChargeBarDisplay.updateChargeBar(log.affectedUnitId);
		PowerDisplay.updatePowerDisplay(log.affectedUnitId);
	}
};
