import * as Force from "@Models/Entities/Force";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as Card from "@Models/Entities/Card";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as ScheduledEffects from "@Core/Combat/ScheduledEffects";
import { Unit } from "@game/Models";
import { calculateCritical } from "@Models/Entities/Unit";

const PROJECTILE_TRAVEL_MS = 200;

/**
 * Cast damage: calculate the amount, log the cast, and schedule the hit.
 * The actual damage is applied later when the projectile lands.
 */
export function dealDamage(
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) {
	const { state, logger } = env;

	const damageAmount = sourceUnit.power;

	const enemyCore = Card.getEnemyCore(state)(sourceUnit.force);

	const crit = calculateCritical(sourceUnit);
	const damage = ((damageAmount + crit.bonusPower) * crit.multiplier) * scale;

	// Log the cast
	logger.log({
		type: "damage_cast",
		sourceId: sourceUnit.id,
		targetId: enemyCore!.id,
		amount: damage,
		travelTime: PROJECTILE_TRAVEL_MS,
	});

	// Schedule the hit
	const currentTimeMs = logger.getCurrentTimeMs();

	env.scheduledEffects = ScheduledEffects.scheduleHit(
		env.scheduledEffects,
		{
			type: "damage",
			hitTimeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
			sourceId: sourceUnit.id,
			targetId: enemyCore!.id,
			amount: damage,
			isCritical: crit.isCritical,
			hasOnCritReaction: crit.isCritical,
		},
	);

}

/**
 * Apply a damage hit that was previously scheduled.
 * Called from ScheduledEffects.processHit when the projectile lands.
 */
export function applyDamageHit(
	env: CombatTypes.CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { state, logger } = env;

	const targetForce = state.battleData.forces.find(
		(force: { id: string }) => force.id !== state.battleData.units.find(u => u.id === hit.sourceId)?.force
	)!;

	const enemyCore = Card.getEnemyCore(state)(state.battleData.units.find(u => u.id === hit.sourceId)!.force);
	const oldLife = enemyCore?.life ?? 0;
	const oldShield = enemyCore?.shield ?? 0;

	const actualLifeChanged = Force.applyDamageToForce(
		state,
		targetForce,
		hit.amount,
		0,
		"normal",
		hit.isCritical ?? false,
	);

	CombatStatsTracker.trackDamage(
		env.combatStates.combatStatsTrackerState,
		env,
		hit.sourceId,
		actualLifeChanged,
	);

	if (hit.hasOnCritReaction && hit.isCritical) {
		const sourceUnit = state.battleData.units.find(u => u.id === hit.sourceId);
		if (sourceUnit) {
			env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
		}
	}

	logger.log({
		type: "damage_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
		newLife: enemyCore?.life,
		newShield: enemyCore?.shield,
		lifeDelta: (enemyCore?.life ?? 0) - oldLife,
		shieldDelta: (enemyCore?.shield ?? 0) - oldShield,
	});
}