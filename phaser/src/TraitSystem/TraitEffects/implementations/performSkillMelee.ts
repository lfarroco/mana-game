/**
 * @file Implementation for trait effect that makes the source unit perform the "slash" skill.
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";

/**
 * Pure function logic for performing the slash skill effect.
 * @param context - The trait effect context containing source unit and scene
 */
export function performSkillMeleeLogic(context: TraitEffectContext): Promise<void> {
	const { sourceUnit, scene } = context;
	
	// We'll use dynamic import to avoid circular dependencies in tests
	return import("../../../Systems/Chara/Skills/slash")
		.then(({ slash }) => slash(scene, sourceUnit));
}

/**
 * Runtime wrapper for the perform skill melee trait effect.
 * Makes the source unit perform the "slash" skill.
 */
export const performSkillMelee: TraitEffectFn = async (context) => {
	return performSkillMeleeLogic(context);
};
