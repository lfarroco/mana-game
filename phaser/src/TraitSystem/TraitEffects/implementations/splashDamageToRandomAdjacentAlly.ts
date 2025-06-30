import { TraitEffectFn } from "../../TraitEffectSystem";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { pickRandom } from "../../../utils";
import { impactEffect } from "../../../Effects";

/**
 * Effect: Deals splash damage to a random adjacent ally
 */
export const splashDamageToRandomAdjacentAllyLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene } = context;
	const percent = (traitInstanceParams.percent ?? effectInstance.percent ?? 50) as number;
	const damage = Math.floor(sourceUnit.power * (percent / 100));

	if (damage <= 0) return;

	if (context.targets.length > 0) {
		const randomAlly = pickRandom(context.targets, 1)[0];
		const chara = getChara(randomAlly.id);
		const sourceChara = getChara(sourceUnit.id);
		if (chara && sourceChara) {
			// Helper function to safely show pop text only when the scene and chara are active
			if (chara && chara.active && scene && scene.scene && scene.scene.isActive()) {
				await chara.showPopText(`-${damage} Dmg`, "damage");
			}
			chara.unitHit(damage);
			impactEffect({ scene, location: chara, pointA: sourceChara, pointB: chara });
		}
	}
};
