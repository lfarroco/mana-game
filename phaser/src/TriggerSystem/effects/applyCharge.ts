import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

const DEFAULT_PROJECTILE_DURATION = 400;

export function applyChargeLogicIO(
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	amount: number,
	delayedExecution?: number
) {
	for (const target of targets) {
		// Apply charge immediately (no callback indirection)
		target.charge += amount;

		// Log the event for playback (pure data, no callback)
		env.logger.log({
			type: "charge",
			frame: env.logger.getCurrentFrame(),
			sourceId: sourceUnit.id,
			targetId: target.id,
			amount: amount,
			duration: DEFAULT_PROJECTILE_DURATION,
			delayed: delayedExecution,
			applyTime: env.logger.getCurrentFrame() + Math.ceil(DEFAULT_PROJECTILE_DURATION / 16.67),
		});
	}
}