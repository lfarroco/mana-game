import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export async function applySlowLogicIO(
	env: CombatEnvironment,
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

	const effects = env.effects;

	for (const target of targets) {
		if (effects.onSlow) {
			effects.onSlow(sourceUnit.id, target.id, duration, effect(target));
		} else {
			effect(target)();
		}
	}
}
