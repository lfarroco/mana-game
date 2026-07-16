import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

export const applyHaste = async (
	env: CombatEnvironment,
	targets: Unit[],
	sourceUnit: Unit,
	duration: number,
	// TODO: revisit this, to no longer require a callback
	onReHaste: (target: Unit) => void,
) => {
	for (const target of targets) {
		if (target.hasted > 0) {
			onReHaste(target);
		}
		target.hasted += duration;

		env.logger.log({
			type: "haste",
			sourceId: sourceUnit.id,
			targetId: target.id,
			effectDuration: duration,
		});
	}
};