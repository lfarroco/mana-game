import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

export const applyHaste = async (
	env: CombatEnvironment,
	targets: Unit[],
	sourceUnit: Unit,
	duration: number,
	onReHaste: (target: Unit) => void,
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
			sourceId: sourceUnit.id,
			targetId: target.id,
			effectDuration: duration,
		});
	}
};