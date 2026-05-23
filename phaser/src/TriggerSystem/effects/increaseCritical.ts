import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "Client/Screens/Battleground/CombatEnvironment";

export const increaseCritical = (
	env: CombatEnvironment,
	targets: Unit[],
	amount: number,
	sourceUnit: Unit | undefined,
	permanent: boolean = false,
	delayedExecution?: number
) => {
	const effect = (target: string) => async () => {
		// Logic update only
		const targetUnit = targets.find(u => u.id === target);
		if (!targetUnit) return;

		if (!targetUnit.critical) targetUnit.critical = 0;
		targetUnit.critical += amount;

		if (permanent) {
			if (!targetUnit.bonusCritical) targetUnit.bonusCritical = 0;
			targetUnit.bonusCritical += amount;
		}
	};

	const effects = env.effects;

	for (const target of targets) {
		if (effects.onIncreaseCritical) {
			effects.onIncreaseCritical(sourceUnit?.id, target.id, effect(target.id), delayedExecution);
		} else {
			effect(target.id)();
		}
	}
};
