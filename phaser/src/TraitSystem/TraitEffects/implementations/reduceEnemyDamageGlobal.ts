import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";

/**
 * Helper function to create effects that affect the entire enemy guild
 */
function createGuildWideEnemyEffect(effectLogic: (targets: any[], context: any) => Promise<void>): TraitEffectFn {
	return async (context) => {
		await effectLogic(context.targets, context);
	};
}

/**
 * Effect: Reduces enemy damage globally while this unit is alive
 */
export const reduceEnemyDamageGlobalLogic: TraitEffectFn = createGuildWideEnemyEffect(async (enemies, context) => {
	const reduction = getEffectParams(context.traitInstanceParams, context.effectInstance, 'reduction', 15);

	for (const enemy of enemies) {
		const chara = getChara(enemy.id);
		if (chara) {
			const damageReduction = Math.floor(enemy.power * (reduction / 100));
			await chara.updateUnitAttribute("power", -damageReduction);
		}
	}
	// Note: In a full implementation, you'd want to track this effect and remove it when the source unit dies
});
