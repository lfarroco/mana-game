import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { Unit } from "../../../Models/Entities/Unit";

/**
 * Helper function to create simple attribute modification effects
 */
function createAttributeModificationEffect(attribute: keyof Unit, isTemporary: boolean = false): TraitEffectFn {
	return async (context) => {
		const { targets } = context;
		const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 0);

		if (isTemporary) {
			// This would need the applyTemporaryAttributeModification helper
			// For now, just do permanent modification
		}

		for (const target of targets) {
			const chara = getChara(target.id);
			if (chara) {
				await chara.updateUnitAttribute(attribute, amount);
			}
		}
	};
}

/**
 * Effect: Permanently increases power of targets
 */
export const increasePowerLogic: TraitEffectFn = createAttributeModificationEffect('power', false);
