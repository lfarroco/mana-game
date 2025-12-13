import { getAlliedCore } from "@Models/Entities/Card";
import { Force, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { getCharaById } from "@Systems/Chara/Chara";
import { reducePoison } from "@Scenes/Battleground/Systems/PoisonDamageSystem";
import { healFx } from "./visuals/heal";
import { processReactions } from "../TriggerSystem";

export const restoreLife = async (sourceUnit: Unit) => {
	const baseAmount = sourceUnit.power;

	const crit = calculateCritical(sourceUnit);

	const healAmount = baseAmount * crit.multiplier;

	const effect = (targetForce: Force, amount: number) => () => {
		const actualHealing = manipulateCoreLife(targetForce, amount, crit.isCritical);

		CombatStatsTracker.trackHeal(sourceUnit.id, actualHealing);

		reducePoison(targetForce.id, actualHealing);

		if (crit.isCritical) {
			processReactions(sourceUnit, { id: "on_crit" });
		}
	};

	const sourceForce = getUnitForce(sourceUnit.id);
	const alliedCore = getAlliedCore(sourceUnit.force);

	healFx(
		getCharaById(sourceUnit.id),
		getCharaById(alliedCore.id),
		effect(sourceForce, healAmount)
	);

};
