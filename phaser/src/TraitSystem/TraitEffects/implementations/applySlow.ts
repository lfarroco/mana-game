/**
 * @file Apply Slow trait effect implementation
 * Uses the new arcaneMissileTargeted effect to shoot a projectile from source to target.
 * When the projectile hits, it applies slow duration and displays the original slow visual effect.
 */

import { arcaneMissileTargeted } from '../../../Effects/arcaneMissileTargeted';
import { slowEffect } from '../../../Effects/slowEffect';
import * as CharaManager from '../../../Scenes/Battleground/Systems/CharaManager';
import BattlegroundScene from '../../../Scenes/Battleground/BattlegroundScene';
import { Unit } from '../../../Models/Entities/Unit';

/**
 * Pure function to create the apply slow effect implementation
 * @returns The trait effect function
 */
export function createApplySlowLogic() {
	return async (context: { scene: BattlegroundScene; sourceUnit: Unit; targets: Unit[]; duration: number }) => {
		const { targets, scene, sourceUnit, duration } = context;

		// Get source character position for arcane missile effect
		const sourceChara = CharaManager.getChara(sourceUnit.id);

		for (const target of targets) {
			// Show a targeted arcane missile effect from source to target
			if (scene && sourceChara) {
				const targetChara = CharaManager.getChara(target.id);
				if (targetChara) {
					// Use the new targeted arcane missile effect with slow callback
					arcaneMissileTargeted(
						scene,
						{ x: sourceChara.x, y: sourceChara.y },
						{ x: targetChara.x, y: targetChara.y },
						{
							colors: [0xD2691E, 0xCD853F, 0xF4A460], // Orange-brownish colors: saddle brown, peru, sandy brown
							amplitudeMin: 5,
							amplitudeMax: 20,
							particleScale: 1.5,
							impact: {
								colors: [0xD2691E, 0xCD853F],
								scale: 2,
								speed: 200,
								lifespan: 300,
								alpha: 0.4
							},
							onHit: async () => {
								// THIS IS THE MOMENT OF IMPACT - Apply slow mutation and show slow effect
								// Add slow duration to the unit's slowed property
								target.slowed += duration;

								// Show the original slow effect at the target location
								slowEffect(scene, { x: targetChara.x, y: targetChara.y }, {
									duration: 1000,
									intensity: 1.5,
									color: 0xD2691E // Orange-brownish color matching the projectile
								});
							}
						}
					);
				}
			} else {
				// Fallback: if no scene or character visual, just apply the slow directly
				target.slowed += duration;
			}
		}
	};
}

/**
 * Apply slow effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const applySlowLogicIO = async (context: { scene: BattlegroundScene; sourceUnit: Unit; targets: Unit[]; duration: number; }) => {
	// Dynamically import to avoid circular dependencies

	const impl = createApplySlowLogic();
	return impl(context);
};
