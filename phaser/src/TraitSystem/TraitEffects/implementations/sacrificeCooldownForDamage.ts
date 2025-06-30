import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";

/**
 * Effect: Sacrifice cooldown for damage (reckless haste)
 * Each attack permanently increases damage but also permanently increases cooldown
 */
export const sacrificeCooldownForDamageLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;
	const cooldownPenalty = getEffectParams(traitInstanceParams, effectInstance, 'cooldown_penalty', 500);
	const damageBonus = getEffectParams(traitInstanceParams, effectInstance, 'damage_bonus', 4);

	const chara = getChara(sourceUnit.id);
	if (chara) {
		// Increase cooldown (slower actions) - this is permanent
		sourceUnit.cooldown += cooldownPenalty;

		// Increase damage permanently
		await chara.updateUnitAttribute("power", damageBonus);
		// Helper function to safely show pop text only when the scene and chara are active
		if (chara && chara.active && context.scene && context.scene.scene && context.scene.scene.isActive()) {
			await chara.showPopText(`Reckless! +${damageBonus} Dmg, +${cooldownPenalty}ms cooldown`);
		}
	}
};
