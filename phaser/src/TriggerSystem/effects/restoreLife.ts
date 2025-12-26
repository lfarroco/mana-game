import { getAlliedCore, getBattleCore } from "@Models/Entities/Card";
import { Force, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { getCharaById } from "@Systems/Chara/Chara";
import { reducePoison } from "@Scenes/Battleground/Systems/PoisonDamageSystem";
import { healFx } from "./visuals/heal";
import { processReactions } from "../TriggerSystem";
import { State } from "@Models/State";

export const restoreLife = async (
	state: State,
	sourceUnit: Unit,
	scale: number = 1
) => {
	const baseAmount = sourceUnit.power;

	const crit = calculateCritical(sourceUnit);

	const healAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;

	const effect = (targetForce: Force, amount: number) => () => {
		const actualHealing = manipulateCoreLife(state, targetForce, amount, crit.isCritical);

		CombatStatsTracker.trackHeal(state, sourceUnit.id, actualHealing);

		reducePoison(targetForce.id, actualHealing);

		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}

		if (getBattleCore(state)(targetForce.id).life + amount > getBattleCore(state)(targetForce.id).maxLife) {
			processReactions(state, sourceUnit, { id: "on_over_heal" });
		}
	};

	const sourceForce = getUnitForce(sourceUnit.id);
	const alliedCore = getAlliedCore(state)(sourceUnit.force);

	healFx(
		getCharaById(sourceUnit.id),
		getCharaById(alliedCore.id),
		effect(sourceForce, healAmount)
	);

};
