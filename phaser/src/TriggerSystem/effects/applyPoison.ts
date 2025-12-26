import { getEnemyCore } from "@Models/Entities/Card";
import { getEnemyForce } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as PoisonSystem from "@Scenes//Battleground/Systems/PoisonDamageSystem";
import * as CombatSystemStates from "@Scenes/Battleground/Systems/CombatSystemStates";
import { getCharaById } from "@Systems/Chara/Chara";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { poisonFx } from "./visuals/poison";
import { processReactions } from "../TriggerSystem";
import { State } from "@Models/State";

export const applyPoisonLogicIO = async (
	state: State,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

	const amount = ((baseAmount + (crit.bonusPower * 0.1)) * crit.multiplier) * scale;

	const targetForce = getEnemyForce(state, sourceUnit.id);

	console.log(
		`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`
	);

	const effect = () => {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		const newPoisonState = PoisonSystem.applyPoison(
			combatStates.poisonSystemState,
			targetForce,
			amount,
			crit.isCritical
		);
		CombatSystemStates.updatePoisonSystemState(newPoisonState);

		CombatStatsTracker.trackPoison(state, sourceUnit.id, amount);
		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}
	}

	poisonFx(
		getCharaById(sourceUnit.id),
		getCharaById(getEnemyCore(state)(sourceUnit.force).id),
		effect
	);
};
