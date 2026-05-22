import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "@TriggerSystem/effects/increasePower";
import { CombatEnvironment } from "Client/Scenes/Battleground/CombatEnvironment";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

export const distributePower = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	permanent: boolean,
	delayedExecution?: number
) => {
	if (targets.length === 0) return;

	const powerToDistribute = Math.floor(sourceUnit.power * 0.5);
	if (powerToDistribute <= 0) return;

	applyPersistentPowerDelta(env, sourceUnit, -powerToDistribute, permanent);

	const powerPerTarget = Math.floor(powerToDistribute / targets.length);

	increasePower(env, targets, powerPerTarget, permanent, sourceUnit, delayedExecution);

	const effects = env.effects;
	if (effects.onPowerUpdate) {
		effects.onPowerUpdate(sourceUnit.id);
	}
};
