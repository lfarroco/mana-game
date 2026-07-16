import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import { applyPersistentPowerDelta } from "@TriggerSystem/effects/applyPersistentPowerDelta";

export const decreasePower = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit: Unit | undefined,
	delayedExecution?: number
) => {
	for (const target of targets) {
		// Apply power delta immediately (no callback indirection)
		applyPersistentPowerDelta(env, target, -amount, permanent);

		// Log the event for playback (pure data, no callback)
		env.logger.log({
			type: "decrease_power",
			frame: env.logger.getCurrentFrame(),
			sourceId: sourceUnit?.id,
			targetId: target.id,
			amount: amount,
			permanent: permanent,
			affectedUnitId: target.id,
			delayed: delayedExecution,
		});
	}
};