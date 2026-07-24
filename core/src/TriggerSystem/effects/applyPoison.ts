import * as Card from "../../Entities/Card";
import * as Force from "../../Entities/Force";
import * as PoisonSystem from "../../Combat/PoisonDamageSystem";
import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import { CombatEnvironment, Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const applyPoison = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(env, sourceUnit);
	env.seed = crit.seed;

	const amount = (baseAmount + crit.bonusPower * 0.1) * crit.multiplier * scale;

	const enemyCore = Card.getEnemyCore(env.combatState)(sourceUnit.force);

	// Log the cast
	env.logger.log({
		type: "poison_cast",
		sourceId: sourceUnit.id,
		targetId: enemyCore.id,
		amount: amount,
		travelTime: PROJECTILE_TRAVEL_MS,
	});

	// Schedule the hit as a deferred event
	const currentTimeMs = env.logger.getCurrentTimeMs();
	const sourceId = sourceUnit.id;
	const targetId = enemyCore.id;
	const isCritical = crit.isCritical;

	env.deferredEvents.push({
		timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
		execute: (env) => {
			const { combatState: state, combatStates } = env;
			const sourceUnit = state.units.find(u => u.id === sourceId);
			if (!sourceUnit) return;

			const targetForce = Force.getEnemyForce(state, sourceId);

			const oldPoison = PoisonSystem.getPoisonRate(combatStates.poisonSystemState, targetForce);

			const newPoisonState = PoisonSystem.applyPoison(
				combatStates.poisonSystemState,
				targetForce,
				amount,
				isCritical,
			);
			combatStates.poisonSystemState = newPoisonState;

			CombatStatsTracker.trackPoison(
				combatStates.combatStatsTrackerState,
				sourceUnit,
				amount
			);

			if (isCritical) {
				processReactions(env, sourceUnit, { id: "on_crit" }, 1);
			}

			const poisonRate = PoisonSystem.getPoisonRate(combatStates.poisonSystemState, targetForce);

			env.logger.log({
				type: "poison_hit",
				sourceId: sourceId,
				targetId: targetId,
				amount: amount,
				newPoison: poisonRate,
				poisonDelta: poisonRate - oldPoison,
			});
		},
	});
};