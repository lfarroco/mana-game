import { Unit } from "@game/Models";
import { increasePower } from "@TriggerSystem/effects/increasePower";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

export const distributePower = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	permanent: boolean,
) => {
	if (targets.length === 0) return;

	const powerToDistribute = Math.floor(sourceUnit.power * 0.5);
	if (powerToDistribute <= 0) return;

	applyPersistentPowerDelta(env, sourceUnit, -powerToDistribute, permanent);

	const powerPerTarget = Math.floor(powerToDistribute / targets.length);

	increasePower(env, targets, powerPerTarget, permanent, sourceUnit);
};