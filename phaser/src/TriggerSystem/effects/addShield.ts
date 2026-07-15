import { getAlliedCore } from "@Models/Entities/Card";
import { manipulateCoreShield } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

const DEFAULT_PROJECTILE_DURATION = 400;

export const addShieldLogicIO = async (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
	delayedExecution?: number
) => {
	const baseAmount = sourceUnit.power;
	const sourceForce = env.state.battleData.forces.find((force) => force.id === sourceUnit.force)!;
	const alliedCore = getAlliedCore(env.state)(sourceUnit.force);

	const crit = calculateCritical(sourceUnit);

	const shieldAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;

	// Apply shield immediately (no callback indirection)
	const actualShieldChange = manipulateCoreShield(env.state, sourceForce, shieldAmount, crit.isCritical, true, env.effects, env.combatStates.forceStatsState);

	if (actualShieldChange > 0) {
		const { combatStates } = env;
		CombatStatsTracker.trackShield(combatStates.combatStatsTrackerState, env, sourceUnit.id, actualShieldChange);
	}

	if (crit.isCritical) {
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	// Log the event for playback (pure data, no callback)
	env.logger.log({
		type: "shield",
		frame: env.logger.getCurrentFrame(),
		sourceId: sourceUnit.id,
		targetId: alliedCore.id,
		amount: shieldAmount,
		duration: DEFAULT_PROJECTILE_DURATION,
		delayed: delayedExecution,
		applyTime: env.logger.getCurrentFrame() + Math.ceil(DEFAULT_PROJECTILE_DURATION / 16.67),
	});
};