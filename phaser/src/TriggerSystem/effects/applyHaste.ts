import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

const DEFAULT_PROJECTILE_DURATION = 400;

export const applyHaste = async (
	env: CombatEnvironment,
	targets: Unit[],
	sourceUnit: Unit,
	duration: number,
	onReHaste: (target: Unit) => void,
	delayedExecution?: number
) => {
	for (const target of targets) {
		// Apply haste immediately (no callback indirection)
		if (target.hasted > 0) {
			onReHaste(target);
		}
		target.hasted += duration;

		// Log the event for playback (pure data, no callback)
		env.logger.log({
			type: "haste",
			frame: env.logger.getCurrentFrame(),
			sourceId: sourceUnit.id,
			targetId: target.id,
			effectDuration: duration,
			duration: DEFAULT_PROJECTILE_DURATION,
			delayed: delayedExecution,
			applyTime: env.logger.getCurrentFrame() + Math.ceil(DEFAULT_PROJECTILE_DURATION / 16.67),
		});
	}
};