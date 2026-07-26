import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import { CombatEnvironment, Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { getBattleCore } from "../../Entities/Card";
import { manipulateCoreShield } from "../../Entities/Force";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const addShield = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power;
	const alliedCore = env.combatState.units.find(u => u.force === sourceUnit.force && u.isCore)!;

	const crit = calculateCritical(env, sourceUnit);
	env.seed = crit.seed;
	const shieldAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;

	// Log the cast
	env.logger.log({
		type: "shield_cast",
		sourceId: sourceUnit.id,
		targetId: alliedCore.id,
		amount: shieldAmount,
		travelTime: PROJECTILE_TRAVEL_MS,
	});

	// Schedule the hit as a deferred event
	const currentTimeMs = env.logger.getCurrentTimeMs();
	const sourceId = sourceUnit.id;
	const targetId = alliedCore.id;
	const isCritical = crit.isCritical;
	const sourceForce = sourceUnit.force;

	env.deferredEvents.push({
		timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
		execute: (env) => {
			const { combatState: state } = env;
			const sourceUnit = state.units.find(u => u.id === sourceId);
			if (!sourceUnit) return;

			const alliedCore = getBattleCore(env.combatState)(sourceUnit.force);
			const oldShield = alliedCore.shield;

			const actualShieldChange = manipulateCoreShield(env.combatState, sourceForce, shieldAmount, isCritical);

			if (actualShieldChange > 0) {
				CombatStatsTracker.trackShield(env.combatStates.combatStatsTrackerState, sourceUnit, actualShieldChange);
			}

			if (isCritical) {
				processReactions(env, sourceUnit, { id: "on_crit" }, 1);
			}

			env.logger.log({
				type: "shield_hit",
				sourceId: sourceId,
				targetId: targetId,
				amount: shieldAmount,
				newShield: alliedCore.shield,
				shieldDelta: alliedCore.shield - oldShield,
			});
		},
	});
};