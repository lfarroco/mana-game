import { TraitEffectFn } from "../../TraitEffectSystem";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";

/**
 * Effect: Fortress mode passive (conditional armor and reflect)
 */
export const fortressModePassiveLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams } = context;
	const armorBonus = (traitInstanceParams.armor_bonus ?? effectInstance.armor_bonus ?? 20) as number;

	// Check if unit is stationary (this would need to be tracked in the movement system)
	// For now, assume fortress units are always stationary when not moving
	const chara = getChara(sourceUnit.id);
	if (chara) {
		await chara.updateUnitAttribute("power", armorBonus); // Using power as armor for simplicity
		// Helper function to safely show pop text only when the scene and chara are active
		if (chara && chara.active && context.scene && context.scene.scene && context.scene.scene.isActive()) {
			await chara.showPopText(`Fortress Mode: +${armorBonus} Armor`);
		}

		// Note: Damage reflection would be implemented in the damage handling system
	}
};
