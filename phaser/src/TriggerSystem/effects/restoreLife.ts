import * as Card from "@Models/Entities/Card";
import * as Force from "@Models/Entities/Force";
import * as Unit from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as CombatTypes from "@Core/Combat/CombatTypes";

export const restoreLife = async (
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit.Unit,
	scale: number = 1,
	delayedExecution?: number
) => {
	const baseAmount = sourceUnit.power;

	const crit = Unit.calculateCritical(sourceUnit);

	const healAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;
	const sourceForce = Force.getUnitForce(env.state, sourceUnit.id);
	const alliedCore = Card.getAlliedCore(env.state)(sourceUnit.force);

	// Apply heal immediately (no callback indirection)
	const actualHealing = Force.manipulateCoreLife(env.state, sourceForce, healAmount, crit.isCritical);

	const { combatStates } = env;
	CombatStatsTracker.trackHeal(combatStates.combatStatsTrackerState, env, sourceUnit.id, actualHealing);

	const newPoisonState = PoisonSystem.reducePoison(
		combatStates.poisonSystemState,
		sourceForce.id,
		actualHealing,
	);
	combatStates.poisonSystemState = newPoisonState;

	if (crit.isCritical) {
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	if (Card.getBattleCore(env.state)(sourceForce.id).life + healAmount > Card.getBattleCore(env.state)(sourceForce.id).maxLife) {
		env.processReactions(env, sourceUnit, { id: "on_over_heal" }, 1);
	}

	// Log the event for playback (pure data, no callback)
	env.logger.log({
		type: "heal",
		frame: env.logger.getCurrentFrame(),
		sourceId: sourceUnit.id,
		targetId: alliedCore.id,
		amount: healAmount,
		delayed: delayedExecution,
	});
};