/**
 * @file Implementation for the apply poison to enemies trait effect.
 * 
 * This effect applies a damage-over-time poison effect to enemy units.
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { Unit } from "../../../Models/Entities/Unit";

/**
 * Pure function logic for applying poison effects.
 * @param damagePerTick - Damage dealt per tick
 * @param duration - Total duration of the poison effect in milliseconds
 * @param tickInterval - Time between damage ticks in milliseconds
 * @param targets - Array of target units to poison
 * @returns Calculation details for the poison effect
 */
export function applyPoisonToEnemiesPure(
	damagePerTick: number,
	duration: number,
	tickInterval: number,
	targets: Unit[]
): {
	damagePerTick: number;
	duration: number;
	tickInterval: number;
	targetCount: number;
	totalTicks: number;
	totalDamagePerTarget: number;
	calculations: Array<{
		unitId: string;
		damagePerTick: number;
		duration: number;
		tickInterval: number;
		estimatedTotalDamage: number;
	}>;
} {
	const safeDamagePerTick = Math.max(0, damagePerTick);
	const safeDuration = Math.max(0, duration);
	const safeTickInterval = Math.max(100, tickInterval); // Minimum 100ms between ticks
	const totalTicks = Math.floor(safeDuration / safeTickInterval);
	const totalDamagePerTarget = totalTicks * safeDamagePerTick;

	const calculations = targets.map(target => ({
		unitId: target.id,
		damagePerTick: safeDamagePerTick,
		duration: safeDuration,
		tickInterval: safeTickInterval,
		estimatedTotalDamage: totalDamagePerTarget
	}));

	return {
		damagePerTick: safeDamagePerTick,
		duration: safeDuration,
		tickInterval: safeTickInterval,
		targetCount: targets.length,
		totalTicks,
		totalDamagePerTarget,
		calculations
	};
}

/**
 * Runtime wrapper that applies poison status effects to enemy targets.
 * This wrapper handles the Phaser scene integration and status effect application.
 */
export const applyPoisonToEnemiesLogic: TraitEffectFn = async (context: TraitEffectContext) => {
	const damagePerTick = getEffectParams(context.traitInstanceParams, context.effectInstance, 'damage_per_tick', 3);
	const duration = getEffectParams(context.traitInstanceParams, context.effectInstance, 'duration', 5000);
	const tickInterval = getEffectParams(context.traitInstanceParams, context.effectInstance, 'tick_interval', 1000);

	// Use dynamic imports to avoid circular dependencies in tests
	const [
		{ getChara },
		{ applyStatusEffect }
	] = await Promise.all([
		import("../../../Scenes/Battleground/Systems/CharaManager"),
		import("../../../Systems/StatusEffects/StatusEffectManager")
	]);

	const { targets, scene } = context;

	for (const enemy of targets) {
		const chara = getChara(enemy.id);
		if (chara) {
			applyStatusEffect(enemy, {
				type: 'poison',
				remainingDuration: duration,
				damagePerTick,
				tickInterval,
				timeSinceLastTick: 0,
				displayName: "Poison"
			});

			// Only show pop text if the scene is still active
			if (chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
				await chara.showPopText("Poison!", "damage");
			}
		}
	}
};
