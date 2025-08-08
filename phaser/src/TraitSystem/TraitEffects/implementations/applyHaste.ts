/**
 * @file Apply Haste trait effect implementation
 * Uses the new arcaneMissileTargeted effect to shoot a projectile from source to target.
 * When the projectile hits, it applies haste duration and displays the original haste visual effect.
 */

import { arcaneMissileTargeted } from '../../../Effects/arcaneMissileTargeted';
import { hasteEffect } from '../../../Effects/hasteEffect';
import * as CharaManager from '../../../Scenes/Battleground/Systems/CharaManager';
import { Unit } from '../../../Models/Entities/Unit';
import BattlegroundScene from '../../../Scenes/Battleground/BattlegroundScene';

/**
 * Pure function to create the apply haste effect implementation
 * @returns The trait effect function
 */
export function createApplyHasteLogic() {
	return async (context: {
		targets: Unit[]; scene: BattlegroundScene;
		sourceUnit: Unit;
		duration: number;
	}) => {
		const { targets, scene, sourceUnit, duration } = context;

		// Get source character position for arcane missile effect
		const sourceChara = CharaManager.getChara(sourceUnit.id);

		for (const target of targets) {
			// Show a targeted arcane missile effect from source to target
			if (scene && sourceChara) {
				const targetChara = CharaManager.getChara(target.id);
				if (targetChara) {
					// Use the new targeted arcane missile effect with haste callback
					arcaneMissileTargeted(
						scene,
						{ x: sourceChara.x, y: sourceChara.y },
						{ x: targetChara.x, y: targetChara.y },
						{
							colors: [0x00FFFF, 0x87CEEB, 0xADD8E6], // Light blue neon colors
							amplitudeMin: 5,
							amplitudeMax: 15,
							particleScale: 1.5,
							impact: {
								colors: [0x00FFFF, 0x87CEEB],
								scale: 2,
								speed: 200,
								lifespan: 300,
								alpha: 0.4
							},
							onHit: async () => {
								// THIS IS THE MOMENT OF IMPACT - Apply haste mutation and show haste effect
								// Add haste duration to the unit's hasted property
								target.hasted += duration;

								// Show the original haste effect at the target location
								hasteEffect(scene, { x: targetChara.x, y: targetChara.y }, {
									duration: 1000,
									intensity: 1.5,
									color: 0x00eaff // Light blue color matching the projectile
								});
							}
						}
					);
				}
			} else {
				// Fallback: if no scene or character visual, just apply the haste directly
				target.hasted += duration;
			}
		}
	};
}

/**
 * Apply haste effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const applyHasteLogicIO = async (context: {
	targets: Unit[];
	scene: BattlegroundScene;
	sourceUnit: Unit;
	duration: number;
}) => {
	// Dynamically import to avoid circular dependencies

	const impl = createApplyHasteLogic();
	return impl(context);
};
