import * as Card from "../../Entities/Card";
import * as Force from "../../Entities/Force";
import * as PoisonSystem from "../../Combat/PoisonDamageSystem";
import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import * as ScheduledEffects from "../../Combat/ScheduledEffects";
import { CombatEnvironment, Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const applyPoison = async (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

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

	// Schedule the hit
	const currentTimeMs = env.logger.getCurrentTimeMs();
	env.scheduledEffects = ScheduledEffects.scheduleHit(
		env.scheduledEffects,
		{
			type: "poison",
			hitTimeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
			sourceId: sourceUnit.id,
			targetId: enemyCore.id,
			amount: amount,
			isCritical: crit.isCritical,
			hasOnCritReaction: crit.isCritical,
		},
	);
};

export function applyPoisonHit(
	env: CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { combatState: state } = env;
	const sourceUnit = state.units.find(u => u.id === hit.sourceId);
	if (!sourceUnit) return;

	const targetForce = Force.getEnemyForce(state, hit.sourceId);

	const { combatStates } = env;
	const oldPoison = PoisonSystem.getPoisonRate(combatStates.poisonSystemState, targetForce);

	const newPoisonState = PoisonSystem.applyPoison(
		combatStates.poisonSystemState,
		targetForce,
		hit.amount,
		hit.isCritical ?? false,
	);
	combatStates.poisonSystemState = newPoisonState;

	CombatStatsTracker.trackPoison(
		combatStates.combatStatsTrackerState,
		env,
		hit.sourceId,
		hit.amount
	);

	if (hit.hasOnCritReaction && hit.isCritical) {
		processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	const poisonRate = PoisonSystem.getPoisonRate(combatStates.poisonSystemState, targetForce);

	env.logger.log({
		type: "poison_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
		newPoison: poisonRate,
		poisonDelta: poisonRate - oldPoison,
	});
}