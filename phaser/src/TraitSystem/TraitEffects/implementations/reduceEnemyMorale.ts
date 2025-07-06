/**
 * @file Implementation for the reduce enemy morale trait effect.
 * 
 * This effect reduces the morale of the enemy force.
 */

import { TraitEffectFn, TraitEffectContext } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";

/**
 * Pure function logic for reducing enemy morale.
 * @param amount - The amount of morale to reduce
 * @param sourceForceId - The ID of the source unit's force
 * @param allForces - Array of all forces in the battle
 * @returns The enemy force ID and reduction amount
 */
export function reduceEnemyMoralePure(
	amount: number,
	sourceForceId: string,
	allForces: { id: string }[]
): {
	amount: number;
	enemyForceId: string | null;
} {
	const enemyForce = allForces.find(f => f.id !== sourceForceId);

	return {
		amount: Math.max(0, amount), // Ensure positive reduction
		enemyForceId: enemyForce?.id || null
	};
}

/**
 * Runtime wrapper that handles enemy morale reduction with scene integration.
 * This wrapper handles the Phaser scene integration and UI updates.
 */
export const reduceEnemyMoraleLogic: TraitEffectFn = async (context: TraitEffectContext) => {
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 75);

	// Use dynamic imports to avoid circular dependencies in tests
	const { manipulateForceMorale: manipulateForceMoreale } = await import("../../../Models/Entities/Force");
	const { getChara } = await import("../../../Scenes/Battleground/Systems/CharaManager");

	const { scene, state, sourceUnit } = context;
	const enemyForceId = state.battleData.forces.find(f => f.id !== sourceUnit.force)?.id;

	if (enemyForceId) {
		const targetForce = state.battleData.forces.find(f => f.id === enemyForceId);

		if (targetForce) {
			// Use the shared utility function that handles morale damage reduction
			const actualChange = manipulateForceMoreale(targetForce, -amount, scene);

			// Show pop text for the source unit
			if (actualChange !== 0) {
				const chara = getChara(sourceUnit.id);
				if (chara && chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
					const sign = actualChange > 0 ? '+' : '';
					await chara.showPopText(`Enemy ${sign}${actualChange} Morale`, actualChange > 0 ? "heal" : "damage");
				}
			}
		}
	}
};
