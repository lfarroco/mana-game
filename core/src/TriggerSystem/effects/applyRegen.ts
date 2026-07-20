import * as Card from "../../Entities/Card";
import * as RegenSystem from "../../Combat/RegenSystem";
import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import * as ScheduledEffects from "../../Combat/ScheduledEffects";
;
import { CombatEnvironment, Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const applyRegen = async (
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

	// Schedule the hit
	const currentTimeMs = env.logger.getCurrentTimeMs();
	env.scheduledEffects = ScheduledEffects.scheduleHit(
		env.scheduledEffects,
		{
			type: "regen",
			hitTimeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
			sourceId: sourceUnit.id,
			targetId: alliedCore.id,
			amount: amount,
			isCritical: crit.isCritical,
			hasOnCritReaction: crit.isCritical,
		},
	);
};

export function applyRegenHit(
	env: CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { combatState: state, combatStates } = env;
	const sourceUnit = state.units.find(u => u.id === hit.sourceId);
	if (!sourceUnit) return;

	const targetForce = state.units.find(u => u.force !== sourceUnit.force)!.force;

	const oldRegen = RegenSystem.getRegenRate(combatStates.regenSystemState, targetForce);

	const newRegenState = RegenSystem.applyRegen(
		combatStates.regenSystemState,
		targetForce,
		hit.amount,
		hit.isCritical ?? false,
	);
	combatStates.regenSystemState = newRegenState;

	CombatStatsTracker.trackRegen(combatStates.combatStatsTrackerState, env, hit.sourceId, hit.amount);

	if (hit.hasOnCritReaction && hit.isCritical) {
		processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	const regenRate = RegenSystem.getRegenRate(combatStates.regenSystemState, targetForce);

	env.logger.log({
		type: "regen_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
		newRegen: regenRate,
		regenDelta: regenRate - oldRegen,
	});
}