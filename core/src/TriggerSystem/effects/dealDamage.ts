import * as Force from "../../Entities/Force";
import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import * as Card from "../../Entities/Card";
import * as ScheduledEffects from "../../Combat/ScheduledEffects";
import { CombatEnvironment, Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

/**
 * Cast damage: calculate the amount, log the cast, and schedule the hit.
 * The actual damage is applied later when the projectile lands.
 */
export function dealDamage(
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) {
	const { combatState, logger } = env;

	const damageAmount = sourceUnit.power;

	const enemyCore = Card.getEnemyCore(combatState)(sourceUnit.force);

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
	env: CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { combatState: state, logger } = env;

	const source = state.units.find(u => u.id === hit.sourceId)!;

	const enemyCore = Card.getEnemyCore(state)(source.force);
	const oldLife = enemyCore?.life ?? 0;
	const oldShield = enemyCore?.shield ?? 0;

	const actualLifeChanged = Force.applyDamageToForce(
		state,
		enemyCore.force,
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
		const sourceUnit = state.units.find(u => u.id === hit.sourceId);
		if (sourceUnit) {
			processReactions(env, sourceUnit, { id: "on_crit" }, 1);
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