import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";

export const applyHasteLogicIO = async (
	_state: State,
	targets: Unit[],
	sourceUnit: Unit,
	duration: number,
	onReHaste: (target: Unit) => void
) => {
	const effect = (target: Unit) => () => {
		if (target.hasted > 0) {
			onReHaste(target);
		}
		target.hasted += duration;
	};

	const effects = CombatEffectsRegistry.getCombatEffects();

	for (const target of targets) {
		if (effects.onHaste) {
			effects.onHaste(sourceUnit.id, target.id, duration, effect(target));
		} else {
			effect(target)();
		}
	}
};
