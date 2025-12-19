import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "./increasePower";
import { updatePowerDisplay } from "@Systems/Chara/PowerDisplay";
import { FORCE_ID_PLAYER } from "@Constants/constants";
import { getState } from "@Models/State";

export const absorbPower = (sourceUnit: Unit, targets: Unit[], permanent: boolean) => {
	if (targets.length === 0) return;

	let totalAbsorbed = 0;

	targets.forEach(target => {
		const absorbedAmount = Math.floor(target.power * 0.25);
		if (absorbedAmount > 0) {
			target.power = Math.max(0, target.power - absorbedAmount);
			totalAbsorbed += absorbedAmount;
			updatePowerDisplay(target.id);

			if (target.force === FORCE_ID_PLAYER && permanent) {
				const persistentTarget = getState().gameData.player.units.find(u => u.id === target.id)!;

				if (persistentTarget !== target) {
					persistentTarget.power = Math.max(0, persistentTarget.power - absorbedAmount);
					updatePowerDisplay(persistentTarget.id);
				}
			}

		}
	});

	if (totalAbsorbed > 0) {
		increasePower([sourceUnit], totalAbsorbed, permanent, sourceUnit);
	}
};
