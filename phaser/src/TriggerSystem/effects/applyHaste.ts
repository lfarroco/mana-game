import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export const applyHasteLogicIO = async (
	env: CombatEnvironment,
	targets: Unit[],
	sourceUnit: Unit,
	duration: number,
	onReHaste: (target: Unit) => void,
	delayedExecution?: number
) => {
	const effect = (target: Unit) => () => {
		if (target.hasted > 0) {
			onReHaste(target);
		}
		target.hasted += duration;
	};

	const effects = env.effects;

	for (const target of targets) {
		if (effects.onHaste) {
			effects.onHaste(sourceUnit.id, target.id, duration, effect(target), delayedExecution);
		} else {
			effect(target)();
		}
	}
};
