import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "./increasePower";

export const distributePower = (sourceUnit: Unit, targets: Unit[]) => {
	if (targets.length === 0) return;

	const powerToDistribute = Math.floor(sourceUnit.power * 0.5);
	if (powerToDistribute <= 0) return;

	sourceUnit.power -= powerToDistribute;

	// Distribute equally among targets
	const powerPerTarget = Math.floor(powerToDistribute / targets.length);

	// If division is not perfect, the remainder is lost (or could be kept by source, but simple is fine)
	increasePower(targets, powerPerTarget, false, sourceUnit);
};
