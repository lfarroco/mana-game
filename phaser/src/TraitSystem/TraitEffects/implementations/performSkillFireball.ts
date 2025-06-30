/**
 * @file Implementation for the fireball skill effect.
 * Makes the source unit perform the "fireball" skill.
 */

import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext, TraitEffectFn } from "../../TraitEffectSystem";

/**
 * Pure function for fireball skill logic.
 * Makes the source unit perform the "fireball" skill.
 */
export function performSkillFireballLogic(context: TraitEffectContext): {
	sourceUnit: Unit;
	scene: BattlegroundScene;
} {
	const { sourceUnit, scene } = context;

	return {
		sourceUnit,
		scene
	};
}

/**
 * Runtime wrapper for the fireball skill effect.
 * Handles actual skill execution with proper async handling.
 */
export const performSkillFireball: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = performSkillFireballLogic(context);

	// Dynamic import to avoid circular dependencies in tests
	const { fireball: fireballSkillFn } = await import("../../../Systems/Chara/Skills/fireball");

	await fireballSkillFn(scene)(sourceUnit);
};
