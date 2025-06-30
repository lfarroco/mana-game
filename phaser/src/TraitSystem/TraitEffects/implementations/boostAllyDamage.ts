/**
 * @file Implementation for the boost ally damage trait effect.
 * 
 * This effect temporarily increases the damage (power) of allied units.
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { Unit } from "../../../Models/Entities/Unit";

/**
 * Pure function logic for boosting ally damage.
 * @param amount - The amount of damage bonus to apply
 * @param duration - How long the boost should last in milliseconds
 * @param targets - Array of target units to boost
 * @returns Calculation details for the boost effect
 */
export function boostAllyDamagePure(
	amount: number, 
	duration: number, 
	targets: Unit[]
): {
	amount: number;
	duration: number;
	targetCount: number;
	calculations: Array<{ unitId: string; damageBoost: number; duration: number }>;
} {
	const calculations = targets.map(target => ({
		unitId: target.id,
		damageBoost: Math.max(0, amount), // Ensure non-negative boost
		duration: Math.max(0, duration) // Ensure non-negative duration
	}));

	return {
		amount: Math.max(0, amount),
		duration: Math.max(0, duration),
		targetCount: targets.length,
		calculations
	};
}

/**
 * Runtime wrapper that applies temporary damage boosts to ally targets.
 * This wrapper handles the Phaser scene integration and UI updates.
 */
export const boostAllyDamageLogic: TraitEffectFn = async (context: TraitEffectContext) => {
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 15);
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 3000);
	const { targets, scene } = context;

	// Use dynamic imports to avoid circular dependencies in tests
	const [
		{ getChara },
		{ applyStatusEffect }
	] = await Promise.all([
		import("../../../Scenes/Battleground/Systems/CharaManager"),
		import("../../../Systems/StatusEffects/StatusEffectManager")
	]);

	for (const target of targets) {
		const chara = getChara(target.id);
		if (chara) {
			const effectType = amount > 0 ? 'power_buff' : 'power_debuff';

			applyStatusEffect(target, {
				type: effectType,
				remainingDuration: duration,
				attribute: 'power',
				amount,
				displayName: `+${amount} Damage!`
			});

			// Only show pop text if the scene is still active (battle hasn't ended)
			if (chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
				await chara.showPopText(`+${amount} Damage!`, undefined);
			}
		}
	}
};
