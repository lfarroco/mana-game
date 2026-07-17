import * as Card from "@Models/Entities/Card";
import * as Force from "@Models/Entities/Force";
import * as Unit from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as ScheduledEffects from "@Core/Combat/ScheduledEffects";

const PROJECTILE_TRAVEL_MS = 200;

export const addShield = async (
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit.Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power;
	const alliedCore = Card.getAlliedCore(env.state)(sourceUnit.force);

	const crit = Unit.calculateCritical(sourceUnit);
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
	const { state } = env;
	const sourceUnit = state.battleData.units.find(u => u.id === hit.sourceId);
	if (!sourceUnit) return;

	const sourceForce = env.state.battleData.forces.find((force) => force.id === sourceUnit.force)!;
	const alliedCore = Card.getAlliedCore(env.state)(sourceUnit.force);
	const oldShield = alliedCore.shield;

	const actualShieldChange = Force.manipulateCoreShield(env.state, sourceForce, hit.amount, hit.isCritical ?? false);

	if (actualShieldChange > 0) {
		CombatStatsTracker.trackShield(env.combatStates.combatStatsTrackerState, env, hit.sourceId, actualShieldChange);
	}

	if (hit.hasOnCritReaction && hit.isCritical) {
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
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