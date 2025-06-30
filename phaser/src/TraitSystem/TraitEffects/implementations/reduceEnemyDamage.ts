import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { Unit } from "../../../Models/Entities/Unit";
import { applyStatusEffect } from "../../../Systems/StatusEffects/StatusEffectManager";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";

/**
 * Helper function to apply a temporary attribute modification to targets
 * Uses the new unified status effect system
 */
async function applyTemporaryAttributeModification(
	targets: Unit[],
	attribute: keyof Unit,
	amount: number,
	duration: number,
	scene: BattlegroundScene,
	popTextOverride?: string
): Promise<void> {
	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			const effectType = amount > 0 ? 'power_buff' : 'power_debuff';

			applyStatusEffect(target, {
				type: effectType,
				remainingDuration: duration,
				attribute,
				amount,
				displayName: popTextOverride || `${amount > 0 ? '+' : ''}${amount} ${attribute}`
			});

			// Only show pop text if the scene is still active (battle hasn't ended)
			if (chara && chara.active && scene && scene.scene && scene.scene.isActive()) {
				await chara.showPopText(popTextOverride || `${amount > 0 ? '+' : ''}${amount} ${attribute}`);
			}
		}
	}
}

/**
 * Effect: Reduces enemy damage temporarily
 */
export const reduceEnemyDamageLogic: TraitEffectFn = async (context) => {
	const { targets, scene } = context;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 8);
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 4000);

	await applyTemporaryAttributeModification(targets, "power", -amount, duration, scene, `-${amount} Damage`);
};
