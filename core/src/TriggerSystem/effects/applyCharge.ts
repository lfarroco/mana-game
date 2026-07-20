import { CombatEnvironment, Unit } from "../../Models";

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

				target.charge += amount;

				env.logger.log({
					type: "charge_hit",
					sourceId: sourceId,
					targetId: targetId,
					amount: amount,
				});
			},
		});
	}
};