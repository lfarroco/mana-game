import * as Card from "../../Entities/Card";
import * as RegenSystem from "../../Combat/RegenSystem";
import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import { CombatEnvironment, Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const applyRegen = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(env, sourceUnit);
	env.seed = crit.seed;

	const amount = (baseAmount + crit.bonusPower * 0.1) * crit.multiplier * scale;

	const alliedCore = Card.getAlliedCore(env.combatState)(sourceUnit.force);

	// Log the cast
	env.logger.log({
		type: "regen_cast",
		sourceId: sourceUnit.id,
		targetId: alliedCore.id,
		amount: amount,
		travelTime: PROJECTILE_TRAVEL_MS,
	});

	// Schedule the hit as a deferred event
	const currentTimeMs = env.logger.getCurrentTimeMs();
	const sourceId = sourceUnit.id;
	const targetId = alliedCore.id;
	const isCritical = crit.isCritical;

	env.deferredEvents.push({
		timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
		execute: (env) => {
			const { combatState: state, combatStates } = env;
			const sourceUnit = state.units.find(u => u.id === sourceId);
			if (!sourceUnit) return;

			const targetForce = state.units.find(u => u.id === sourceId)!.force;

			const oldRegen = RegenSystem.getRegenRate(combatStates.regenSystemState, targetForce);

			const newRegenState = RegenSystem.applyRegen(
				combatStates.regenSystemState,
				targetForce,
				amount,
				isCritical,
			);
			combatStates.regenSystemState = newRegenState;

			CombatStatsTracker.trackRegen(combatStates.combatStatsTrackerState, env, sourceId, amount);

			if (isCritical) {
				processReactions(env, sourceUnit, { id: "on_crit" }, 1);
			}

			const regenRate = RegenSystem.getRegenRate(combatStates.regenSystemState, targetForce);

			env.logger.log({
				type: "regen_hit",
				sourceId: sourceId,
				targetId: targetId,
				amount: amount,
				newRegen: regenRate,
				regenDelta: regenRate - oldRegen,
			});
		},
	});
};