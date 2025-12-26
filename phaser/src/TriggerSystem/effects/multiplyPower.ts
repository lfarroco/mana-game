import { Unit } from "@Models/Entities/Unit";
import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";

export const multiplyPower = async (context: {
	targets: Unit[];
	sourceUnit: Unit;
	multiplier: number;
}) => {
	const { targets, multiplier } = context;

	const effects = CombatEffectsRegistry.getCombatEffects();

	for (const target of targets) {
		console.log(`Multiplying power of ${target.id} by ${multiplier}`);
		const currentPower = target.power;
		const newPower = Math.floor(currentPower * multiplier);
		const powerDifference = newPower - currentPower;

		target.power += powerDifference;

		if (effects.onPowerUpdate) {
			effects.onPowerUpdate(target.id);
		}

		// Note: removed sfx_spell_innerfocus sound as it's not crucial for server/logic separation 
		// or requires a generic sound callback.
	}
};
