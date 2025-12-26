import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";

export function applyChargeLogicIO(_state: State, sourceUnit: Unit, targets: Unit[], amount: number) {
	const effects = CombatEffectsRegistry.getCombatEffects();

	for (const target of targets) {
		const effect = () => {
			target.charge += amount;
		};

		if (effects.onCharge) {
			effects.onCharge(sourceUnit.id, target.id, amount, effect);
		} else {
			effect();
		}
	}
}
