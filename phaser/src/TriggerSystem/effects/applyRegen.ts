import { getAlliedCore } from "@Models/Entities/Card";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as RegenSystem from "@Scenes//Battleground/Systems/RegenSystem";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export const applyRegenLogicIO = async (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

	const amount = ((baseAmount + (crit.bonusPower * 0.1)) * crit.multiplier) * scale;

	const targetForce = env.state.battleData.forces.find((force) => force.id === sourceUnit.force)!;

	console.log(
		`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen rate: ${amount}, Total healing over time: ${amount * 10}`
	);

	const effect = () => {
		const { combatStates } = env;
		const newRegenState = RegenSystem.applyRegen(
			combatStates.regenSystemState,
			targetForce,
			amount,
			crit.isCritical,
			env.effects
		);

		combatStates.regenSystemState = newRegenState;

		CombatStatsTracker.trackRegen(combatStates.combatStatsTrackerState, env, sourceUnit.id, amount);
		if (crit.isCritical) {
			env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
		}
	};

	const alliedCore = getAlliedCore(env.state)(sourceUnit.force);

	const effects = env.effects;
	if (effects.onRegen) {
		effects.onRegen(sourceUnit.id, alliedCore.id, effect);
	} else {
		effect();
	}
};
