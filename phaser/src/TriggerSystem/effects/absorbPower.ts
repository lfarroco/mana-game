import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "./increasePower";

export const absorbPower = (sourceUnit: Unit, targets: Unit[]) => {
	if (targets.length === 0) return;

	let totalAbsorbed = 0;

	targets.forEach(target => {
		const absorbedAmount = Math.floor(target.power * 0.25);
		if (absorbedAmount > 0) {
			target.power -= absorbedAmount;
			totalAbsorbed += absorbedAmount;
		}
	});

	if (totalAbsorbed > 0) {
		increasePower([sourceUnit], totalAbsorbed, false, sourceUnit);
	}
};
