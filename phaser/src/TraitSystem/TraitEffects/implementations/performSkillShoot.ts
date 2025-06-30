/**
 * @file Implementation for the performSkillShoot trait effect
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";

/**
 * Pure function for making the source unit perform the "shoot" skill
 */
export function performSkillShootLogic(context: TraitEffectContext): void {
	// This is a pure function that just validates the inputs
	if (!context.sourceUnit) {
		throw new Error('performSkillShoot: sourceUnit is required');
	}
	if (!context.scene) {
		throw new Error('performSkillShoot: scene is required');
	}
}

/**
 * Runtime wrapper for the performSkillShoot effect
 */
export const performSkillShoot: TraitEffectFn = async (context) => {
	// Validate inputs using pure function
	performSkillShootLogic(context);

	// Use dynamic import to avoid circular dependencies
	const { shoot: shootSkillFn } = await import("../../../Systems/Chara/Skills/shoot");

	const { sourceUnit, scene } = context;
	await shootSkillFn(scene)(sourceUnit);
};
