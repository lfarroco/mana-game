import { Unit } from "../../Models";
import { CombatEnvironment } from "../../CombatTypes";

export const increaseCritical = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	sourceUnit: Unit | undefined,
	permanent: boolean = false,
) => {
	for (const target of targets) {
		if (!target.critical) target.critical = 0;
		target.critical += amount;

		if (permanent) {
			if (!target.bonusCritical) target.bonusCritical = 0;
			target.bonusCritical += amount;
		}

		env.logger.log({
			type: "increase_critical",
			sourceId: sourceUnit?.id,
			targetId: target.id,
		});
	}
};