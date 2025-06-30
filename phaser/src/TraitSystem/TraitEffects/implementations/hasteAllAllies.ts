/**
 * @file Implementation for the haste all allies trait effect.
 * 
 * This effect applies a haste effect (reduced cooldown) to all allied units.
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { Unit } from "../../../Models/Entities/Unit";

/**
 * Pure function logic for hasting all allies.
 * @param duration - How long the haste effect should last in milliseconds
 * @param targets - Array of target units to haste
 * @param multiplier - Cooldown multiplier (0.5 = half cooldown = twice as fast)
 * @returns Calculation details for the haste effect
 */
export function hasteAllAlliesPure(
	duration: number, 
	targets: Unit[],
	multiplier: number = 0.5
): {
	duration: number;
	multiplier: number;
	targetCount: number;
	calculations: Array<{ unitId: string; duration: number; cooldownMultiplier: number }>;
} {
	const calculations = targets.map(target => ({
		unitId: target.id,
		duration: Math.max(0, duration), // Ensure non-negative duration
		cooldownMultiplier: Math.max(0.1, Math.min(2.0, multiplier)) // Clamp between 0.1 and 2.0
	}));

	return {
		duration: Math.max(0, duration),
		multiplier: Math.max(0.1, Math.min(2.0, multiplier)),
		targetCount: targets.length,
		calculations
	};
}

/**
 * Runtime wrapper that applies haste effects to ally targets.
 * This wrapper handles the Phaser scene integration and UI updates.
 */
export const hasteAllAlliesLogic: TraitEffectFn = async (context: TraitEffectContext) => {
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 2500);
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
			// Apply haste effect (cooldown multiplier < 1.0 means faster actions)
			applyStatusEffect(target, {
				type: 'haste',
				remainingDuration: duration,
				cooldownMultiplier: 0.5,
				displayName: 'Hasted'
			});

			// Only show pop text if the scene is still active
			if (chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
				await chara.showPopText("Hasted!", undefined);
			}
		}
	}
};
