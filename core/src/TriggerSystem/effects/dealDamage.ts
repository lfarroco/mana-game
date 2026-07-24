import * as Force from "../../Entities/Force";
import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import * as Card from "../../Entities/Card";
import { CombatEnvironment, Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

/**
 * Cast damage: calculate the amount, log the cast, and schedule the hit
 * as a deferred event that will execute when the projectile lands.
 */
export function dealDamage(
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) {
	const { combatState, logger } = env;

	const damageAmount = sourceUnit.power;

	const enemyCore = Card.getEnemyCore(combatState)(sourceUnit.force);

	const crit = calculateCritical(env, sourceUnit);
	env.seed = crit.seed;
	const damage = ((damageAmount + crit.bonusPower) * crit.multiplier) * scale;

	// Log the cast
	logger.log({
		type: "damage_cast",
		sourceId: sourceUnit.id,
		targetId: enemyCore!.id,
		amount: damage,
		travelTime: PROJECTILE_TRAVEL_MS,
	});

	// Schedule the hit as a deferred event
	const currentTimeMs = logger.getCurrentTimeMs();
	const sourceId = sourceUnit.id;
	const targetId = enemyCore!.id;
	const isCritical = crit.isCritical;

	env.deferredEvents.push({
		timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
		execute: (env) => {
			const { combatState: state, logger } = env;

			const source = state.units.find(u => u.id === sourceId);
			if (!source) return;

			const enemyCore = Card.getEnemyCore(state)(source.force);
			const oldLife = enemyCore?.life ?? 0;
			const oldShield = enemyCore?.shield ?? 0;

			const actualLifeChanged = Force.applyDamageToForce(
				state,
				enemyCore!.force,
				damage,
				0,
				"normal",
				isCritical,
			);

			CombatStatsTracker.trackDamage(
				env.combatStates.combatStatsTrackerState,
				source,
				actualLifeChanged,
			);

			if (isCritical) {
				const sourceUnit = state.units.find(u => u.id === sourceId);
				if (sourceUnit) {
					processReactions(env, sourceUnit, { id: "on_crit" }, 1);
				}
			}

			logger.log({
				type: "damage_hit",
				sourceId: sourceId,
				targetId: targetId,
				amount: damage,
				newLife: enemyCore?.life,
				newShield: enemyCore?.shield,
				lifeDelta: (enemyCore?.life ?? 0) - oldLife,
				shieldDelta: (enemyCore?.shield ?? 0) - oldShield,
			});
		},
	});
}