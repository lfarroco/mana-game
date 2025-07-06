/**
 * @file Implementation for the restore force morale trait effect.
 * 
 * This effect restores morale to the unit's force.
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";

/**
 * Pure function logic for restoring force morale.
 * @param amount - The amount of morale to restore
 * @param sourceForceId - The ID of the force to restore morale to
 * @returns The calculated morale restoration amount
 */
export function restoreForceMoralePure(amount: number, sourceForceId: string): {
	amount: number;
	forceId: string;
} {
	return {
		amount: Math.max(0, amount), // Ensure positive restoration
		forceId: sourceForceId
	};
}

/**
 * Runtime wrapper that handles morale restoration with scene integration.
 * This wrapper handles the Phaser scene integration and UI updates.
 */
export const restoreForceMoraleLogic: TraitEffectFn = async (context: TraitEffectContext) => {
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 50);

	// Use dynamic imports to avoid circular dependencies in tests
	const [
		{ manipulateForceMorale: manipulateForceMoreale },
		{ getChara }
	] = await Promise.all([
		import("../../../Models/Entities/Force"),
		import("../../../Scenes/Battleground/Systems/CharaManager")
	]);

	const { scene, state, sourceUnit } = context;
	const targetForce = state.battleData.forces.find(f => f.id === sourceUnit.force);

	if (targetForce) {
		// Use the shared utility function that handles morale damage reduction
		const actualChange = manipulateForceMoreale(targetForce, amount, scene);

		// Show pop text for the source unit
		if (actualChange !== 0) {
			const chara = getChara(sourceUnit.id);
			if (chara && chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
				const sign = actualChange > 0 ? '+' : '';
				await chara.showPopText(`${sign}${actualChange} Morale`, actualChange > 0 ? "heal" : "damage");
			}
		}
	}
};
