import { getAlliedCore } from "@Models/Entities/Card";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import { getState, State } from "@Models/State";
import * as RegenSystem from "@Scenes//Battleground/Systems/RegenSystem";
import * as CombatSystemStates from "@Scenes/Battleground/Systems/CombatSystemStates";

import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { processReactions } from "../TriggerSystem";
import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";

export const applyRegenLogicIO = async (
	state: State,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

	const amount = ((baseAmount + (crit.bonusPower * 0.1)) * crit.multiplier) * scale;

	const targetForce = getState().battleData.forces.find((force) => force.id === sourceUnit.force)!;

	console.log(
		`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen rate: ${amount}, Total healing over time: ${amount * 10}`
	);

	const effect = () => {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		const newRegenState = RegenSystem.applyRegen(
			combatStates.regenSystemState,
			targetForce,
			amount,
			crit.isCritical
		);
		CombatSystemStates.updateRegenSystemState(newRegenState);

		CombatStatsTracker.trackRegen(combatStates.combatStatsTrackerState, state, sourceUnit.id, amount);
		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}
	};

	const alliedCore = getAlliedCore(state)(sourceUnit.force);

	const effects = CombatEffectsRegistry.getCombatEffects();
	if (effects.onRegen) {
		effects.onRegen(sourceUnit.id, alliedCore.id, effect);
	} else {
		effect();
	}
};
