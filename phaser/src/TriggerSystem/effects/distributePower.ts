import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "./increasePower";
import { updatePowerDisplay } from "@Systems/Chara/PowerDisplay";

export const distributePower = (sourceUnit: Unit, targets: Unit[]) => {
	if (targets.length === 0) return;

	const powerToDistribute = Math.floor(sourceUnit.power * 0.5);
	if (powerToDistribute <= 0) return;

	sourceUnit.power -= powerToDistribute;

	const powerPerTarget = Math.floor(powerToDistribute / targets.length);

	increasePower(targets, powerPerTarget, false, sourceUnit);

	updatePowerDisplay(sourceUnit.id)
};
