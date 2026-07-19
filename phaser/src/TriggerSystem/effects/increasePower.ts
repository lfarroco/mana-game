import { Unit } from "@game/Models";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

export const increasePower = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit?: Unit,
) => {
	for (const target of targets) {
		applyPersistentPowerDelta(env, target, amount, permanent);

		env.logger.log({
			type: "increase_power",
			sourceId: sourceUnit?.id,
			targetId: target.id,
			amount: amount,
			permanent: permanent,
		});
	}
};