import * as Card from "../../Entities/Card";
import * as Force from "../../Entities/Force";
import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import * as PoisonSystem from "../../Combat/PoisonDamageSystem";
import * as ScheduledEffects from "../../Combat/ScheduledEffects";
import { calculateCritical } from "../../Entities/Unit";
import { CombatEnvironment, Unit } from "../../Models";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const restoreLife = async (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power;
	const crit = calculateCritical(sourceUnit);
	const healAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;
	const sourceForce = Force.getUnitForce(env.combatState, sourceUnit.id);
	const alliedCore = Card.getAlliedCore(env.combatState)(sourceUnit.force);

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
			hasOnOverHealReaction: (Card.getBattleCore(env.combatState)(sourceForce).life + healAmount > Card.getBattleCore(env.combatState)(sourceForce).maxLife),
		},
	);
};

export function applyHealHit(
	env: CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { combatState: state, combatStates } = env;
	const sourceUnit = state.units.find(u => u.id === hit.sourceId);
	if (!sourceUnit) return;

	const sourceForce = Force.getUnitForce(state, hit.sourceId);

	const alliedCore = Card.getAlliedCore(env.combatState)(sourceUnit.force);
	const oldLife = alliedCore.life;

	const actualHealing = Force.manipulateCoreLife(state, sourceForce, hit.amount, hit.isCritical ?? false);

	CombatStatsTracker.trackHeal(combatStates.combatStatsTrackerState, env, hit.sourceId, actualHealing);

	const newPoisonState = PoisonSystem.reducePoison(
		combatStates.poisonSystemState,
		sourceForce,
		actualHealing,
	);
	combatStates.poisonSystemState = newPoisonState;

	if (hit.hasOnCritReaction && hit.isCritical) {
		processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	if (hit.hasOnOverHealReaction) {
		processReactions(env, sourceUnit, { id: "on_over_heal" }, 1);
	}

	const poisonRate = PoisonSystem.getPoisonRate(combatStates.poisonSystemState, sourceForce);

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