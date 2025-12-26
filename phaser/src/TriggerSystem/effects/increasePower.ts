import { Unit } from "@Models/Entities/Unit";
import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";

export const increasePower = async (
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit?: Unit // sources like orbs apply direct power increase
) => {
	const effect = (targetUnit: Unit) => async () => {
		targetUnit.power += amount;
		if (permanent) {
			targetUnit.bonusPower += amount;
		}
	};

	const effects = CombatEffectsRegistry.getCombatEffects();

	for (const target of targets) {
		if (effects.onIncreasePower) {
			effects.onIncreasePower(sourceUnit?.id, target.id, effect(target));
		} else {
			effect(target)();
		}
	}
};
