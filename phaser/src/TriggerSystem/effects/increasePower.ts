import { Unit } from "@Models/Entities/Unit";
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
		// Apply power delta immediately (no callback indirection)
		applyPersistentPowerDelta(env, target, amount, permanent);

		// Log the event for playback (pure data, no callback)
		env.logger.log({
			type: "increase_power",
			frame: env.logger.getCurrentFrame(),
			sourceId: sourceUnit?.id,
			targetId: target.id,
			amount: amount,
			permanent: permanent,
		});
	}
};