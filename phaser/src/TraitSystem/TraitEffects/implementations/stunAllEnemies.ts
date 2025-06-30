import { TraitEffectFn } from "../../TraitEffectSystem";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { applyStatusEffect } from "../../../Systems/StatusEffects/StatusEffectManager";

/**
 * Effect: Stuns all enemies
 */
export const stunAllEnemiesLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, scene } = context;
	const duration = (traitInstanceParams.duration ?? effectInstance.duration ?? 1200) as number;

	for (const enemy of targets) {
		const chara = getChara(enemy.id);
		if (chara) {
			applyStatusEffect(enemy, {
				type: 'stun',
				remainingDuration: duration,
				displayName: 'Stunned'
			});

			// Only show pop text if the scene is still active
			if (chara && chara.active && scene && scene.scene && scene.scene.isActive()) {
				await chara.showPopText("Stunned!", "damage");
			}
		}
	}
};
