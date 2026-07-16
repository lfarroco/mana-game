import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "@TriggerSystem/effects/increasePower";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

export const absorbPower = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	permanent: boolean,
) => {
	if (targets.length === 0) return;

	// Compute absorbed amounts upfront before any callbacks fire
	const absorptions = targets
		.map((target) => ({ target, amount: Math.floor(target.power * 0.25) }))
		.filter(({ amount }) => amount > 0);

	if (absorptions.length === 0) return;

	const totalAbsorbed = absorptions.reduce((sum, { amount }) => sum + amount, 0);

	// For each drained unit: apply power decrease immediately and log
	absorptions.forEach(({ target, amount }) => {
		applyPersistentPowerDelta(env, target, -amount, permanent);

		// Log the decrease event for each drained unit
		env.logger.log({
			type: "decrease_power",
			frame: env.logger.getCurrentFrame(),
			sourceId: sourceUnit.id,
			targetId: target.id,
			amount: amount,
			permanent: permanent,
			affectedUnitId: target.id,
		});
	});

	// Give the absorbed power to the absorber
	increasePower(env, [sourceUnit], totalAbsorbed, permanent);
};