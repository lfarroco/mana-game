import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as ScheduledEffects from "@Core/Combat/ScheduledEffects";
import * as Logger from "@Utils/Logger";

const PROJECTILE_TRAVEL_MS = 200;

export const applyRegen = async (
	env: CombatTypes.CombatEnvironment,
	sourceUnit: Unit.Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = Unit.calculateCritical(sourceUnit);

	const amount = (baseAmount + crit.bonusPower * 0.1) * crit.multiplier * scale;

	Logger.debug("applyRegen", 
		`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen rate: ${amount}, Total healing over time: ${amount * 10}`
	);

	const alliedCore = Card.getAlliedCore(env.state)(sourceUnit.force);

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
	env: CombatTypes.CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { state } = env;
	const sourceUnit = state.battleData.units.find(u => u.id === hit.sourceId);
	if (!sourceUnit) return;

	const targetForce = env.state.battleData.forces.find((force) => force.id === sourceUnit.force)!;

	const { combatStates } = env;
	const oldRegen = RegenSystem.getRegenRate(combatStates.regenSystemState, targetForce.id);

	const newRegenState = RegenSystem.applyRegen(
		combatStates.regenSystemState,
		targetForce,
		hit.amount,
		hit.isCritical ?? false,
	);
	combatStates.regenSystemState = newRegenState;

	CombatStatsTracker.trackRegen(combatStates.combatStatsTrackerState, env, hit.sourceId, hit.amount);

	if (hit.hasOnCritReaction && hit.isCritical) {
		env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
	}

	const regenRate = RegenSystem.getRegenRate(combatStates.regenSystemState, targetForce.id);

	env.logger.log({
		type: "regen_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
		newRegen: regenRate,
		regenDelta: regenRate - oldRegen,
	});
}