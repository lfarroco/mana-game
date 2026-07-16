import * as Card from "@Models/Entities/Card";
import * as Force from "@Models/Entities/Force";
import * as Unit from "@Models/Entities/Unit";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as Logger from "@Utils/Logger";


export const applyPoison = async (
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit.Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = Unit.calculateCritical(sourceUnit);

	const amount = (baseAmount + crit.bonusPower * 0.1) * crit.multiplier * scale;

	const targetForce = Force.getEnemyForce(env.state, sourceUnit.id);

	Logger.debug("applyPoison", 
		`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`
	);

	const { combatStates } = env;
	const newPoisonState = PoisonSystem.applyPoison(
		combatStates.poisonSystemState,
		targetForce,
		amount,
		crit.isCritical,
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

	env.logger.log({
		type: "poison",
		sourceId: sourceUnit.id,
		targetId: Card.getEnemyCore(env.state)(sourceUnit.force).id,
		amount: amount,
	});
};