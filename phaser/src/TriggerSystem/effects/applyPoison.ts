import { getEnemyCore } from "@Models/Entities/Card";
import { getEnemyForce } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("applyPoison");

export const applyPoisonLogicIO = async (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
	delayedExecution?: number
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

	const amount = (baseAmount + crit.bonusPower * 0.1) * crit.multiplier * scale;

	const targetForce = getEnemyForce(env.state, sourceUnit.id);

	logger.debug(
		`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`
	);

	const effect = () => {
		const { combatStates } = env;
		const newPoisonState = PoisonSystem.applyPoison(
			combatStates.poisonSystemState,
			targetForce,
			amount,
			crit.isCritical,
			env.effects
		);
		combatStates.poisonSystemState = newPoisonState;

		CombatStatsTracker.trackPoison(
			combatStates.combatStatsTrackerState,
			env,
			sourceUnit.id,
			amount
		);
		if (crit.isCritical) {
			env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
		}
	};

	const effects = env.effects;
	if (effects.onPoison) {
		effects.onPoison(
			sourceUnit.id,
			getEnemyCore(env.state)(sourceUnit.force).id,
			amount,
			effect,
			delayedExecution
		);
	} else {
		effect();
	}
};
