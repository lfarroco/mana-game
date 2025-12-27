import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export const decreasePower = async (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit?: Unit
) => {
	const effect = (targetUnit: Unit) => async () => {
		const newPower = Math.max(0, targetUnit.power - amount);
		const delta = newPower - targetUnit.power;
		targetUnit.power += delta;
		if (permanent) {
			targetUnit.bonusPower += delta;
		}
	};

	const effects = env.effects;

	for (const target of targets) {
		if (effects.onDecreasePower) {
			effects.onDecreasePower(sourceUnit?.id, target.id, effect(target));
		} else {
			effect(target)();
		}
	}
};
