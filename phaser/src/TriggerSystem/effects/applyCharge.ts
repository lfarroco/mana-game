import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import * as ScheduledEffects from "@Core/Combat/ScheduledEffects";

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
	const { state } = env;
	const target = state.battleData.units.find(u => u.id === hit.targetId);
	if (!target) return;

	target.charge += hit.amount;

	env.logger.log({
		type: "charge_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		amount: hit.amount,
	});
}