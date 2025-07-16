/**
 * @file Apply Charge trait effect implementation
 * Uses the arcane missile targeted effect to shoot a projectile from source to target.
 * When the projectile hits, it applies charge to the unit and displays a charge visual effect.
 */

import { TraitEffectFn } from '../../TraitEffectSystem';
import { getEffectParams } from '../../TraitSystem.pure';
import { arcaneMissileTargeted } from '../../../Effects/arcaneMissileTargeted';
import { hasteEffect } from '../../../Effects/hasteEffect'; // Reusing haste effect for now, can be changed later
import * as CharaManager from '../../../Scenes/Battleground/Systems/CharaManager';

/**
 * Pure function to create the apply charge effect implementation
 * @returns The trait effect function
 */
export function createApplyChargeLogic(): TraitEffectFn {
	return async (context) => {
		const { targets, scene, sourceUnit } = context;
		const chargeAmount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 1);

		// Get source character position for arcane missile effect
		const sourceChara = CharaManager.getChara(sourceUnit.id);

		for (const target of targets) {
			// Show a targeted arcane missile effect from source to target
			if (scene && sourceChara) {
				const targetChara = CharaManager.getChara(target.id);
				if (targetChara) {
					// Use the targeted arcane missile effect with charge callback
					await arcaneMissileTargeted(
						scene,
						{ x: sourceChara.x, y: sourceChara.y },
						{ x: targetChara.x, y: targetChara.y },
						{
							colors: [0xFFD700, 0xFFA500, 0xFF8C00], // Golden/orange colors for charge
							amplitudeMin: 5,
							amplitudeMax: 15,
							particleScale: 1.5,
							impact: {
								colors: [0xFFD700, 0xFFA500],
								scale: 2,
								speed: 200,
								lifespan: 300,
								alpha: 0.4
							},
							onHit: async () => {
								// THIS IS THE MOMENT OF IMPACT - Apply charge mutation and show charge effect
								// Add charge amount to the unit's charge property
								if (!target.charge) {
									target.charge = 0;
								}
								target.charge += chargeAmount;

								// Show the charge effect at the target location (reusing haste effect for now)
								await hasteEffect(scene, { x: targetChara.x, y: targetChara.y }, {
									duration: 1000,
									intensity: 1.5,
									color: 0xFFD700 // Golden color for charge
								});
							}
						}
					);
				}
			} else {
				// Fallback: if no scene or character visual, just apply the charge directly
				if (!target.charge) {
					target.charge = 0;
				}
				target.charge += chargeAmount;
			}
		}
	};
}

/**
 * Apply charge effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const applyChargeLogicIO: TraitEffectFn = async (context) => {
	// Dynamically import to avoid circular dependencies

	const impl = createApplyChargeLogic();
	return impl(context);
};
