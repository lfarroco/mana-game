import { getEnemyCore } from "@Models/Entities/Card";
import { getEnemyForce } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import { applyPoison } from "@Scenes//Battleground/Systems/PoisonDamageSystem";
import { getCharaById } from "@Systems/Chara/Chara";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { poisonFx } from "./visuals/poison";

export const applyPoisonLogicIO = async (sourceUnit: Unit) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

	const amount = baseAmount * crit.multiplier;

	const targetForce = getEnemyForce(sourceUnit.id);

	console.log(
		`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`
	);

	const effect = () => {
		applyPoison(targetForce, amount, crit.isCritical);
		CombatStatsTracker.trackPoison(sourceUnit.id, amount);
	}

	poisonFx(
		getCharaById(sourceUnit.id),
		getCharaById(getEnemyCore(sourceUnit.force).id),
		effect
	);
};
