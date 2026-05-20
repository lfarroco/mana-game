import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

export const increasePower = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit?: Unit,
	delayedExecution?: number
) => {
	const effect = (targetUnit: Unit) => async () => {
		applyPersistentPowerDelta(env, targetUnit, amount, permanent);
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
