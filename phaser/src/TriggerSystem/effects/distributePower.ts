import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "./increasePower";
import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";
import { getState } from "@Models/State";
import { FORCE_ID_PLAYER } from "@Constants/constants";

export const distributePower = (sourceUnit: Unit, targets: Unit[], permanent: boolean) => {
	if (targets.length === 0) return;

	const powerToDistribute = Math.floor(sourceUnit.power * 0.5);
	if (powerToDistribute <= 0) return;

	sourceUnit.power = Math.max(0, sourceUnit.power - powerToDistribute);

	const bonusToLose = Math.max(0, Math.min(sourceUnit.bonusPower, powerToDistribute));
	sourceUnit.bonusPower -= bonusToLose;

	if (sourceUnit.force === FORCE_ID_PLAYER) {
		const playerUnit = getState().gameData.player.units.find((u) => u.id === sourceUnit.id);
		if (playerUnit && playerUnit !== sourceUnit) {
			playerUnit.bonusPower = Math.max(0, playerUnit.bonusPower - bonusToLose);
			playerUnit.power = Math.max(0, playerUnit.power - bonusToLose);
		}
	}

	const powerPerTarget = Math.floor(powerToDistribute / targets.length);

	increasePower(targets, powerPerTarget, permanent, sourceUnit);

	const effects = CombatEffectsRegistry.getCombatEffects();
	if (effects.onPowerUpdate) {
		effects.onPowerUpdate(sourceUnit.id);
	}
};
