import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";

export async function applySlowLogicIO(
	_state: State,
	sourceUnit: Unit,
	targets: Unit[],
	duration: number,
	onReSlow?: (target: Unit) => void
) {
	const effect = (target: Unit) => () => {
		if (target.slowed > 0 && onReSlow) {
			onReSlow(target);
		}
		target.slowed += duration;
	};

	const effects = CombatEffectsRegistry.getCombatEffects();

	for (const target of targets) {
		if (effects.onSlow) {
			effects.onSlow(sourceUnit.id, target.id, duration, effect(target));
		} else {
			effect(target)();
		}
	}
}
