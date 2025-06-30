import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { applyStatusEffect } from "../../../Systems/StatusEffects/StatusEffectManager";

/**
 * Effect: Damage scales with time in battle (growing fury)
 * This provides a temporary boost that scales with time, replacing any previous fury effect
 */
export const damageScalesWithTimeLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene } = context;
	const damagePerTime = getEffectParams(traitInstanceParams, effectInstance, 'damage_per_time', 1);
	const timeThreshold = getEffectParams(traitInstanceParams, effectInstance, 'time_threshold', 1000);

	const timeInBattle = scene.time.now; // Keep in milliseconds
	const timeSegments = Math.floor(timeInBattle / timeThreshold);
	const currentFuryBonus = timeSegments * damagePerTime;

	// Apply fury scaling effect (this will automatically replace any existing fury effect)
	if (currentFuryBonus > 0) {
		const chara = getChara(sourceUnit.id);
		if (chara) {
			applyStatusEffect(sourceUnit, {
				type: 'fury_scaling',
				remainingDuration: Number.MAX_SAFE_INTEGER, // Lasts until battle ends
				attribute: 'power',
				amount: currentFuryBonus,
				stackId: 'berserker_fury', // Prevents stacking
				displayName: `Fury: ${currentFuryBonus}`
			});

			// Helper function to safely show pop text only when the scene and chara are active
			if (chara && chara.active && context.scene && context.scene.scene && context.scene.scene.isActive()) {
				await chara.showPopText(`Fury: ${currentFuryBonus} bonus!`);
			}
		}
	}
};
