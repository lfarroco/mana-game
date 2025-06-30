import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";

/**
 * Effect: Chance to dodge incoming damage
 */
export const chanceToDodgeLogic: TraitEffectFn = async (context) => {
	const { sourceUnit } = context;
	const dodgeChance = getEffectParams(context.traitInstanceParams, context.effectInstance, 'dodge_chance', 30);

	// This would typically be implemented in the damage handling system
	// For now, we'll just show the passive effect is active
	const chara = getChara(sourceUnit.id);
	if (chara && Math.random() * 100 < dodgeChance) {
		// Helper function to safely show pop text only when the scene and chara are active
		if (chara && chara.active && context.scene && context.scene.scene && context.scene.scene.isActive()) {
			await chara.showPopText("Dodged!");
		}
	}
};
