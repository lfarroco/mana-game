import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

const DEFAULT_PROJECTILE_DURATION = 400;

export async function applySlow(
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	duration: number,
	onReSlow?: (target: Unit) => void,
	delayedExecution?: number
) {
	for (const target of targets) {
		// Apply slow immediately (no callback indirection)
		if (target.slowed > 0 && onReSlow) {
			onReSlow(target);
		}
		target.slowed += duration;

		// Log the event for playback (pure data, no callback)
		env.logger.log({
			type: "slow",
			frame: env.logger.getCurrentFrame(),
			sourceId: sourceUnit.id,
			targetId: target.id,
			effectDuration: duration,
			duration: DEFAULT_PROJECTILE_DURATION,
			delayed: delayedExecution,
			applyTime: env.logger.getCurrentFrame() + Math.ceil(DEFAULT_PROJECTILE_DURATION / 16.67),
		});
	}
}