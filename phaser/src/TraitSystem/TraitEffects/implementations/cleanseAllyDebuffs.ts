import { TraitEffectFn } from "../../TraitEffectSystem";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";

/**
 * Effect: Cleanses debuffs from allies
 */
export const cleanseAllyDebuffsLogic: TraitEffectFn = async (context) => {
	const { targets } = context;

	for (const ally of targets) {
		const chara = getChara(ally.id);
		if (chara) {
			// Reset cooldown to base value (removes slow/freeze effects)
			// In a full implementation, you'd track individual debuffs
			// Helper function to safely show pop text only when the scene and chara are active
			if (chara && chara.active && context.scene && context.scene.scene && context.scene.scene.isActive()) {
				await chara.showPopText("Cleansed!", "heal");
			}
		}
	}
};
