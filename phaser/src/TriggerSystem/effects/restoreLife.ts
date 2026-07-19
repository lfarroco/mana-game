import * as Card from "@Models/Entities/Card";
import * as Force from "@Models/Entities/Force";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as ScheduledEffects from "@Core/Combat/ScheduledEffects";
import { calculateCritical } from "@Models/Entities/Unit";
import { Unit } from "@game/Models";

const PROJECTILE_TRAVEL_MS = 200;

export const restoreLife = async (
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power;
	const crit = calculateCritical(sourceUnit);
	const healAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;
	const sourceForce = Force.getUnitForce(env.state, sourceUnit.id);
	const alliedCore = Card.getAlliedCore(env.state)(sourceUnit.force);

	// Log the cast
	env.logger.log({
		type: "heal_cast",
		sourceId: sourceUnit.id,
		targetId: alliedCore.id,
		amount: healAmount,
		travelTime: PROJECTILE_TRAVEL_MS,
	});

	// Schedule the hit
	const currentTimeMs = env.logger.getCurrentTimeMs();
	env.scheduledEffects = ScheduledEffects.scheduleHit(
		env.scheduledEffects,
		{
			type: "heal",
			hitTimeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
			sourceId: sourceUnit.id,
			targetId: alliedCore.id,
			amount: healAmount,
			isCritical: crit.isCritical,
			hasOnCritReaction: crit.isCritical,
			hasOnOverHealReaction: (Card.getBattleCore(env.state)(sourceForce.id).life + healAmount > Card.getBattleCore(env.state)(sourceForce.id).maxLife),
		},
	);
};

export function applyHealHit(
	env: CombatTypes.CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { state, combatStates } = env;
	const sourceUnit = state.battleData.units.find(u => u.id === hit.sourceId);
	if (!sourceUnit) return;

	const sourceForce = Force.getUnitForce(state, hit.sourceId);

	const alliedCore = Card.getAlliedCore(env.state)(sourceUnit.force);
	const oldLife = alliedCore.life;

	const actualHealing = Force.manipulateCoreLife(state, sourceForce, hit.amount, hit.isCritical ?? false);

	CombatStatsTracker.trackHeal(combatStates.combatStatsTrackerState, env, hit.sourceId, actualHealing);

	const newPoisonState = PoisonSystem.reducePoison(
		combatStates.poisonSystemState,
		sourceForce.id,
		actualHealing,
	);
	combatStates.poisonSystemState = newPoisonState;

	if (hit.hasOnCritReaction && hit.isCritical) {
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	if (hit.hasOnOverHealReaction) {
		env.processReactions(env, sourceUnit, { id: "on_over_heal" }, 1);
	}

	const poisonRate = PoisonSystem.getPoisonRate(combatStates.poisonSystemState, sourceForce.id);

	env.logger.log({
		type: "heal_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
		newLife: alliedCore.life,
		newPoison: poisonRate,
		lifeDelta: alliedCore.life - oldLife,
	});
}