import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

export const decreasePower = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit: Unit | undefined,
	delayedExecution?: number
) => {
	const effect = (targetUnit: Unit) => async () => {
		applyPersistentPowerDelta(env, targetUnit, -amount, permanent);
	};

	const effects = env.effects;

	for (const target of targets) {
		if (effects.onDecreasePower) {
			effects.onDecreasePower(
				sourceUnit?.id,
				target.id,
				amount,
				permanent,
				effect(target),
				delayedExecution,
				target.id
			);
		} else {
			effect(target)();
		}
	}
};
