import { getAlliedCore, getBattleCore } from "@Models/Entities/Card";
import { Force, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import * as PoisonSystem from "@Scenes/Battleground/Systems/PoisonDamageSystem";
import * as CombatSystemStates from "@Scenes/Battleground/Systems/CombatSystemStates";
import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";
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
	const sourceForce = getUnitForce(state, sourceUnit.id);
	const alliedCore = getAlliedCore(state)(sourceUnit.force);

	const effect = (targetForce: Force, amount: number) => () => {
		const actualHealing = manipulateCoreLife(state, targetForce, amount, crit.isCritical);

		const combatStates = CombatSystemStates.getCombatSystemStates();
		CombatStatsTracker.trackHeal(combatStates.combatStatsTrackerState, state, sourceUnit.id, actualHealing);

		const newPoisonState = PoisonSystem.reducePoison(
			combatStates.poisonSystemState,
			targetForce.id,
			actualHealing
		);
		CombatSystemStates.updatePoisonSystemState(newPoisonState);

		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}

		if (getBattleCore(state)(targetForce.id).life + amount > getBattleCore(state)(targetForce.id).maxLife) {
			processReactions(state, sourceUnit, { id: "on_over_heal" });
		}
	};

	const effects = CombatEffectsRegistry.getCombatEffects();
	if (effects.onHeal) {
		effects.onHeal(sourceUnit.id, alliedCore.id, effect(sourceForce, healAmount));
	} else {
		effect(sourceForce, healAmount)();
	}
};
