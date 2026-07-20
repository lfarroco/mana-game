import { CombatEnvironment, Unit } from "../../Models";

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

		// Schedule the hit as a deferred event
		const currentTimeMs = env.logger.getCurrentTimeMs();
		const targetId = target.id;
		const sourceId = sourceUnit.id;

		env.deferredEvents.push({
			timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
			execute: (env) => {
				const { combatState: state } = env;
				const target = state.units.find(u => u.id === targetId);
				if (!target) return;

				target.hasted += duration;

				env.logger.log({
					type: "haste_hit",
					sourceId: sourceId,
					targetId: targetId,
					effectDuration: duration,
				});
			},
		});
	}
};