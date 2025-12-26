import { getEnemyCore } from "@Models/Entities/Card";
import { getEnemyForce } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import { applyPoison } from "@Scenes//Battleground/Systems/PoisonDamageSystem";
import { getCharaById } from "@Systems/Chara/Chara";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { poisonFx } from "./visuals/poison";
import { processReactions } from "../TriggerSystem";
import { State } from "@Models/State";

export const applyPoisonLogicIO = async (state: State, sourceUnit: Unit, scale: number = 1) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

	const amount = ((baseAmount + (crit.bonusPower * 0.1)) * crit.multiplier) * scale;

	const targetForce = getEnemyForce(sourceUnit.id);

	console.log(
		`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`
	);

	const effect = () => {
		applyPoison(targetForce, amount, crit.isCritical);
		CombatStatsTracker.trackPoison(state, sourceUnit.id, amount);
		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}
	}

	poisonFx(
		getCharaById(sourceUnit.id),
		getCharaById(getEnemyCore(sourceUnit.force).id),
		effect
	);
};
