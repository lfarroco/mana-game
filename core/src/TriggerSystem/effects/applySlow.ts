import { CombatEnvironment, Unit } from "../../Models";
import * as ScheduledEffects from "../../Combat/ScheduledEffects";

const PROJECTILE_TRAVEL_MS = 200;

export async function applySlow(
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	duration: number,
	onReSlow?: (target: Unit) => void,
) {
	for (const target of targets) {
		if (target.slowed > 0 && onReSlow) {
			onReSlow(target);
		}

		// Log the cast
		env.logger.log({
			type: "slow_cast",
			sourceId: sourceUnit.id,
			targetId: target.id,
			effectDuration: duration,
			travelTime: PROJECTILE_TRAVEL_MS,
		});

		// Schedule the hit
		const currentTimeMs = env.logger.getCurrentTimeMs();
		env.scheduledEffects = ScheduledEffects.scheduleHit(
			env.scheduledEffects,
			{
				type: "slow",
				hitTimeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
				sourceId: sourceUnit.id,
				targetId: target.id,
				amount: 0,
				effectDuration: duration,
			},
		);
	}
}

export function applySlowHit(
	env: CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { combatState: state } = env;
	const target = state.units.find(u => u.id === hit.targetId);
	if (!target) return;

	target.slowed += (hit.effectDuration ?? 0);

	env.logger.log({
		type: "slow_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		effectDuration: hit.effectDuration ?? 0,
	});
}