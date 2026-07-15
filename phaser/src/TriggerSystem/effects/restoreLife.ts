import { getAlliedCore, getBattleCore } from "@Models/Entities/Card";
import { getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

const DEFAULT_PROJECTILE_DURATION = 400;

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

	// Apply heal immediately (no callback indirection)
	const actualHealing = manipulateCoreLife(env.state, sourceForce, healAmount, crit.isCritical, env.effects, env.combatStates.forceStatsState);

	const { combatStates } = env;
	CombatStatsTracker.trackHeal(combatStates.combatStatsTrackerState, env, sourceUnit.id, actualHealing);

	const newPoisonState = PoisonSystem.reducePoison(
		combatStates.poisonSystemState,
		sourceForce.id,
		actualHealing,
		env.effects
	);
	combatStates.poisonSystemState = newPoisonState;

	if (crit.isCritical) {
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	if (getBattleCore(env.state)(sourceForce.id).life + healAmount > getBattleCore(env.state)(sourceForce.id).maxLife) {
		env.processReactions(env, sourceUnit, { id: "on_over_heal" }, 1);
	}

	// Log the event for playback (pure data, no callback)
	env.logger.log({
		type: "heal",
		frame: env.logger.getCurrentFrame(),
		sourceId: sourceUnit.id,
		targetId: alliedCore.id,
		amount: healAmount,
		duration: DEFAULT_PROJECTILE_DURATION,
		delayed: delayedExecution,
		applyTime: env.logger.getCurrentFrame() + Math.ceil(DEFAULT_PROJECTILE_DURATION / 16.67),
	});
};