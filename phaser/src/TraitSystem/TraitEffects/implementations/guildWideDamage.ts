/**
 * @file Implementation for the guild-wide damage trait effect.
 * 
 * This effect deals damage to all enemies.
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { Unit } from "../../../Models/Entities/Unit";

/**
 * Pure function logic for guild-wide damage calculation.
 * @param damage - The base damage amount
 * @param targets - Array of target units
 * @returns Array of damage calculations for each target
 */
export function guildWideDamagePure(
	damage: number,
	targets: Unit[]
): {
	damage: number;
	targetCount: number;
	calculations: Array<{ unitId: string; damage: number }>;
} {
	const calculations = targets.map(target => ({
		unitId: target.id,
		damage: Math.max(0, damage) // Ensure non-negative damage
	}));

	return {
		damage: Math.max(0, damage),
		targetCount: targets.length,
		calculations
	};
}

/**
 * Runtime wrapper that applies guild-wide damage to all enemy targets.
 * This wrapper handles the Phaser scene integration and UI updates.
 */
export const guildWideDamageLogic: TraitEffectFn = async (context: TraitEffectContext) => {
	const damage = getEffectParams(context.traitInstanceParams, context.effectInstance, 'damage', 15);
	const { targets, scene } = context;

	// Use dynamic import to avoid circular dependencies in tests
	const { getChara } = await import("../../../Scenes/Battleground/Systems/CharaManager");

	for (const enemy of targets) {
		const chara = getChara(enemy.id);
		if (chara && chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
			await chara.showPopText(`-${damage} Dmg`, "damage");
			//chara.unitHit(damage);
		}
	}
};
