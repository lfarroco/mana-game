import { TraitEffectFn } from "../../TraitEffectSystem";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { applyStatusEffect } from "../../../Systems/StatusEffects/StatusEffectManager";

/**
 * Effect: Freezes all enemies (prevents actions)
 */
export const freezeAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, scene } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 1500) as number;

	for (const enemy of targets) {
		const chara = getChara(enemy.id);
		if (chara) {
			applyStatusEffect(enemy, {
				type: 'freeze',
				remainingDuration: duration,
				displayName: 'Frozen'
			});

			// Only show pop text if the scene is still active
			if (chara && chara.active && scene && scene.scene && scene.scene.isActive()) {
				await chara.showPopText("Frozen!", "damage");
			}
		}
	}
};
