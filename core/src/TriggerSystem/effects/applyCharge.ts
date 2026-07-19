import { CombatEnvironment, Unit } from "../../Models";
import * as ScheduledEffects from "../../Combat/ScheduledEffects";

const PROJECTILE_TRAVEL_MS = 200;

export function applyCharge(
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	amount: number,
) {
	for (const target of targets) {
		// Log the cast
		env.logger.log({
			type: "charge_cast",
			sourceId: sourceUnit.id,
			targetId: target.id,
			amount: amount,
			travelTime: PROJECTILE_TRAVEL_MS,
		});

		// Schedule the hit
		const currentTimeMs = env.logger.getCurrentTimeMs();
		env.scheduledEffects = ScheduledEffects.scheduleHit(
			env.scheduledEffects,
			{
				type: "charge",
				hitTimeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
				sourceId: sourceUnit.id,
				targetId: target.id,
				amount: amount,
			},
		);
	}
}

export function applyChargeHit(
	env: CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { combatState: state } = env;
	const target = state.units.find(u => u.id === hit.targetId);
	if (!target) return;

	target.charge += hit.amount;

	env.logger.log({
		type: "charge_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
	});
}