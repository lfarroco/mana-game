/**
 * @file Apply Charge trait effect implementation
 * Uses the arcane missile targeted effect to shoot a projectile from source to target.
 * When the projectile hits, it applies charge to the unit and displays a charge visual effect.
 */

import { arcaneMissileTargeted } from '../../Effects/arcaneMissileTargeted';
import { hasteEffect } from '../../Effects/hasteEffect'; // Reusing haste effect for now, can be changed later
import * as CharaManager from '../../Scenes/Battleground/Systems/CharaManager';
import { Unit } from '../../Models/Entities/Unit';
import BattlegroundScene from '../../Scenes/Battleground/BattlegroundScene';

/**
 * Pure function to create the apply charge effect implementation
 * @returns The trait effect function
 */
export function createApplyChargeLogic() {
	return async (context: { targets: Unit[]; scene: BattlegroundScene; sourceUnit: Unit; amount: number }) => {
		const { targets, scene, sourceUnit, amount } = context;

		// Get source character position for arcane missile effect
		const sourceChara = CharaManager.getChara(sourceUnit.id);

		for (const target of targets) {
			const targetChara = CharaManager.getChara(target.id);
			if (targetChara) {
				// Use the targeted arcane missile effect with charge callback
				arcaneMissileTargeted(
					scene,
					sourceChara,
					targetChara,
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
							target.charge += amount;

							// Show the charge effect at the target location (reusing haste effect for now)
							hasteEffect(scene, targetChara, {
								duration: 1000,
								intensity: 1.5,
								color: 0xFFD700 // Golden color for charge
							});
						}
					}
				);
			}
		}
	};
}

/**
 * Apply charge effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const applyChargeLogicIO = async (context: { targets: Unit[]; scene: BattlegroundScene; sourceUnit: Unit; amount: number; }) => {
	// Dynamically import to avoid circular dependencies

	const impl = createApplyChargeLogic();
	return impl(context);
};
