import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "@TriggerSystem/effects/increasePower";
import { CombatEnvironment } from "Client/Screens/Battleground/CombatEnvironment";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

export const absorbPower = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	permanent: boolean,
	delayedExecution?: number
) => {
	if (targets.length === 0) return;

	const { effects } = env;

	// Compute absorbed amounts upfront before any callbacks fire
	const absorptions = targets
		.map((target) => ({ target, amount: Math.floor(target.power * 0.25) }))
		.filter(({ amount }) => amount > 0);

	if (absorptions.length === 0) return;

	const totalAbsorbed = absorptions.reduce((sum, { amount }) => sum + amount, 0);

	// For each drained unit, show a projectile flying toward the absorber.
	// The actual power decrease is applied in onHit (when the projectile arrives).
	absorptions.forEach(({ target, amount }) => {
		const onHit = () => {
			applyPersistentPowerDelta(env, target, -amount, permanent);

			if (effects.onPowerUpdate) {
				effects.onPowerUpdate(target.id);
			}
		};

		if (effects.onDecreasePower) {
			// sourceId = drained unit, targetId = absorber → projectile flies from target → absorber
			effects.onDecreasePower(
				target.id,
				sourceUnit.id,
				amount,
				permanent,
				onHit,
				delayedExecution,
				target.id
			);
		} else {
			onHit();
		}
	});

	// Give the absorbed power to the absorber (no projectile needed — the drain visuals convey the flow)
	increasePower(env, [sourceUnit], totalAbsorbed, permanent, undefined, delayedExecution);
};
