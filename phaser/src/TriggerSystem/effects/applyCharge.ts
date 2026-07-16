import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

export function applyCharge(
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	amount: number,
) {
	for (const target of targets) {
		target.charge += amount;

		env.logger.log({
			type: "charge",
			sourceId: sourceUnit.id,
			targetId: target.id,
			amount: amount,
		});
	}
}