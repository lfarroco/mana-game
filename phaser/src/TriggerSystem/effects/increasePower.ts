import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

const DEFAULT_PROJECTILE_DURATION = 400;

export const increasePower = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit?: Unit,
	delayedExecution?: number
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
			duration: sourceUnit ? DEFAULT_PROJECTILE_DURATION : 0,
			delayed: delayedExecution,
			applyTime: env.logger.getCurrentFrame() + (sourceUnit ? Math.ceil(DEFAULT_PROJECTILE_DURATION / 16.67) : 0),
		});
	}
};