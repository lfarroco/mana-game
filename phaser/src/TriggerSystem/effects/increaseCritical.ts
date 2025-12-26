import { Unit } from "@Models/Entities/Unit";
import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";

export const increaseCritical = async (
	targets: Unit[],
	amount: number,
	sourceUnit?: Unit,
	permanent: boolean = false
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

		// Note: updateUnitCritical in Chara.ts also updated playerForce global unit but that seemed like state duplication.
		// For now we stick to unit data update.
	};

	const effects = CombatEffectsRegistry.getCombatEffects();

	for (const target of targets) {
		if (effects.onIncreaseCritical) {
			effects.onIncreaseCritical(sourceUnit?.id, target.id, effect(target.id));
		} else {
			effect(target.id)();
		}
	}
};
