import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "./increasePower";
import { FORCE_ID_PLAYER } from "@Constants/constants";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export const absorbPower = (env: CombatEnvironment, sourceUnit: Unit, targets: Unit[], permanent: boolean, delayedExecution?: number) => {
	if (targets.length === 0) return;

	const { state } = env;
	let totalAbsorbed = 0;

	const { effects } = env;

	targets.forEach(target => {
		const absorbedAmount = Math.floor(target.power * 0.25);
		if (absorbedAmount > 0) {
			target.power = Math.max(0, target.power - absorbedAmount);
			totalAbsorbed += absorbedAmount;

			if (effects.onPowerUpdate) {
				effects.onPowerUpdate(target.id);
			}

			if (target.force === FORCE_ID_PLAYER && permanent) {
				const persistentTarget = state.gameData.player.units.find(u => u.id === target.id)!;

				if (persistentTarget !== target) {
					persistentTarget.power = Math.max(0, persistentTarget.power - absorbedAmount);
					if (effects.onPowerUpdate) {
						effects.onPowerUpdate(persistentTarget.id);
					}
				}
			}

		}
	});

	if (totalAbsorbed > 0) {
		increasePower(env, [sourceUnit], totalAbsorbed, permanent, sourceUnit, delayedExecution);
	}
};
