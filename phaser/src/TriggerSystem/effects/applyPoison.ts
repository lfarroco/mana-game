import * as Card from "@Models/Entities/Card";
import * as Force from "@Models/Entities/Force";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as ScheduledEffects from "@Core/Combat/ScheduledEffects";
import * as Logger from "@Utils/Logger";
import { Unit } from "@game/Models";
import { calculateCritical } from "@Models/Entities/Unit";

const PROJECTILE_TRAVEL_MS = 200;

export const applyPoison = async (
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

	const amount = (baseAmount + crit.bonusPower * 0.1) * crit.multiplier * scale;

	Logger.debug("applyPoison",
		`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`
	);

	const enemyCore = Card.getEnemyCore(env.state)(sourceUnit.force);

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
	env: CombatTypes.CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { state } = env;
	const sourceUnit = state.battleData.units.find(u => u.id === hit.sourceId);
	if (!sourceUnit) return;

	const targetForce = Force.getEnemyForce(state, hit.sourceId);

	const { combatStates } = env;
	const oldPoison = PoisonSystem.getPoisonRate(combatStates.poisonSystemState, targetForce.id);

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
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	const poisonRate = PoisonSystem.getPoisonRate(combatStates.poisonSystemState, targetForce.id);

	env.logger.log({
		type: "poison_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
		newPoison: poisonRate,
		poisonDelta: poisonRate - oldPoison,
	});
}