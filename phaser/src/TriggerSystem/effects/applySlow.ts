import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

export async function applySlow(
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	duration: number,
	onReSlow?: (target: Unit) => void,
) {
	for (const target of targets) {
		if (target.slowed > 0 && onReSlow) {
			onReSlow(target);
		}
		target.slowed += duration;

		env.logger.log({
			type: "slow",
			sourceId: sourceUnit.id,
			targetId: target.id,
			effectDuration: duration,
		});
	}
}