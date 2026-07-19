import * as CombatStatsTracker from "../../CombatStatsTracker";
import * as CombatTypes from "../../CombatTypes";
import * as ScheduledEffects from "../../ScheduledEffects";
import { Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { getAlliedCore } from "../../Entities/Card";
import { manipulateCoreShield } from "../../Entities/Force";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const addShield = async (
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power;
	const alliedCore = env.combatState.units.find(u => u.force === sourceUnit.force && u.isCore)!;

	const crit = calculateCritical(sourceUnit);
	const shieldAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;

	// Log the cast
	env.logger.log({
		type: "shield_cast",
		sourceId: sourceUnit.id,
		targetId: alliedCore.id,
		amount: shieldAmount,
		travelTime: PROJECTILE_TRAVEL_MS,
	});

	// Schedule the hit
	const currentTimeMs = env.logger.getCurrentTimeMs();
	env.scheduledEffects = ScheduledEffects.scheduleHit(
		env.scheduledEffects,
		{
			type: "shield",
			hitTimeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
			sourceId: sourceUnit.id,
			targetId: alliedCore.id,
			amount: shieldAmount,
			isCritical: crit.isCritical,
			hasOnCritReaction: crit.isCritical,
		},
	);
};

export function applyShieldHit(
	env: CombatTypes.CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { combatState: state } = env;
	const sourceUnit = state.units.find(u => u.id === hit.sourceId);
	if (!sourceUnit) return;

	const alliedCore = getAlliedCore(env.combatState)(sourceUnit.force);
	const oldShield = alliedCore.shield;

	const actualShieldChange = manipulateCoreShield(env.combatState, sourceUnit.force, hit.amount, hit.isCritical ?? false);

	if (actualShieldChange > 0) {
		CombatStatsTracker.trackShield(env.combatStates.combatStatsTrackerState, env, hit.sourceId, actualShieldChange);
	}

	if (hit.hasOnCritReaction && hit.isCritical) {
		processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	env.logger.log({
		type: "shield_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
		newShield: alliedCore.shield,
		shieldDelta: alliedCore.shield - oldShield,
	});
}