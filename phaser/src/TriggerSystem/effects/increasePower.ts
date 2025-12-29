import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export const increasePower = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit?: Unit,
	delayedExecution?: number
) => {
	const effect = (targetUnit: Unit) => async () => {
		targetUnit.power += amount;
		if (permanent) {
			targetUnit.bonusPower += amount;
		}
	};

	const effects = env.effects;

	for (const target of targets) {
		if (effects.onIncreasePower) {
			effects.onIncreasePower(sourceUnit?.id, target.id, amount, permanent, effect(target), delayedExecution);
		} else {
			effect(target)();
		}
	}
};
