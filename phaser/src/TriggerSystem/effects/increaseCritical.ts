import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

export const increaseCritical = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	sourceUnit: Unit | undefined,
	permanent: boolean = false,
	delayedExecution?: number
) => {
	for (const target of targets) {
		// Apply critical increase immediately (no callback indirection)
		if (!target.critical) target.critical = 0;
		target.critical += amount;

		if (permanent) {
			if (!target.bonusCritical) target.bonusCritical = 0;
			target.bonusCritical += amount;
		}

		// Log the event for playback (pure data, no callback)
		env.logger.log({
			type: "increase_critical",
			frame: env.logger.getCurrentFrame(),
			sourceId: sourceUnit?.id,
			targetId: target.id,
			delayed: delayedExecution,
		});
	}
};