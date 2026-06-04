import { getAlliedCore, getBattleCore } from "@Models/Entities/Card";
import { Force, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

export const restoreLife = async (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
	delayedExecution?: number
) => {
	const baseAmount = sourceUnit.power;

	const crit = calculateCritical(sourceUnit);

	const healAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;
	const sourceForce = getUnitForce(env.state, sourceUnit.id);
	const alliedCore = getAlliedCore(env.state)(sourceUnit.force);

	const effect = (targetForce: Force, amount: number) => () => {
		const actualHealing = manipulateCoreLife(env.state, targetForce, amount, crit.isCritical, env.effects, env.combatStates.forceStatsState);

		const { combatStates } = env;
		CombatStatsTracker.trackHeal(combatStates.combatStatsTrackerState, env, sourceUnit.id, actualHealing);

		const newPoisonState = PoisonSystem.reducePoison(
			combatStates.poisonSystemState,
			targetForce.id,
			actualHealing,
			env.effects
		);
		combatStates.poisonSystemState = newPoisonState;

		if (crit.isCritical) {
			env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
		}

		if (getBattleCore(env.state)(targetForce.id).life + amount > getBattleCore(env.state)(targetForce.id).maxLife) {
			env.processReactions(env, sourceUnit, { id: "on_over_heal" }, 1);
		}
	};

	const effects = env.effects;
	if (effects.onHeal) {
		effects.onHeal(sourceUnit.id, alliedCore.id, healAmount, effect(sourceForce, healAmount), delayedExecution);
	} else {
		effect(sourceForce, healAmount)();
	}
};
