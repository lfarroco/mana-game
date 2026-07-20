import { CombatEnvironment, Unit } from "../../Models";
import * as ScheduledEffects from "../../Combat/ScheduledEffects";

const PROJECTILE_TRAVEL_MS = 200;

export const applyHaste = (
	env: CombatEnvironment,
	targets: Unit[],
	sourceUnit: Unit,
	duration: number,
	onReHaste: (target: Unit) => void,
) => {
	for (const target of targets) {
		if (target.hasted > 0) {
			onReHaste(target);
		}

		// Log the cast
		env.logger.log({
			type: "haste_cast",
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
				type: "haste",
				hitTimeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
				sourceId: sourceUnit.id,
				targetId: target.id,
				amount: 0,
				effectDuration: duration,
			},
		);
	}
};

export function applyHasteHit(
	env: CombatEnvironment,
	hit: ScheduledEffects.PendingHit,
) {
	const { combatState: state } = env;
	const target = state.units.find(u => u.id === hit.targetId);
	if (!target) return;

	target.hasted += (hit.effectDuration ?? 0);

	env.logger.log({
		type: "haste_hit",
		sourceId: hit.sourceId,
		targetId: hit.targetId,
		effectDuration: hit.effectDuration ?? 0,
	});
}