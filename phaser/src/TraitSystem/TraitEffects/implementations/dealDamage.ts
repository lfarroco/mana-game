/**
 * @file Deal Damage trait effect implementation
 * This effect deals direct damage to targets and shows damage pop text.
 */

import { GameEvents } from '../../../constants/events';
import { Force, applyDamageToForce } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
import { getMoraleBarPosition, MORALE_BAR_WIDTH } from '../../../Scenes/Battleground/MoraleDisplay';
import { getChara } from '../../../Scenes/Battleground/Systems/CharaManager';
import { TraitEffectFn } from '../../TraitEffectSystem';

/**
 * Pure function to create the deal damage effect implementation
 * @returns The trait effect function
 */
export function createDealDamageLogic(
	emitter: (unit: Unit, amount: number) => void,
	dealDamage: (targetForce: Force, damage: number, scene: Phaser.Scene, shieldPiercingPercentage?: number) => void
): TraitEffectFn {
	return async (context) => {
		const { sourceUnit, effectInstance, traitInstanceParams } = context;

		// Use unit's power as damage amount
		// Use trait 'amount' if present, otherwise fallback to unit's power
		let damageAmount = effectInstance.amount ?? traitInstanceParams.amount ?? sourceUnit.power;

		emitter(sourceUnit, damageAmount);

		const targetForce = context.state.battleData.forces.find(
			(force) => force.id !== sourceUnit.force
		)!;


		// Show a red projectile from source unit to enemy morale bar
		if (context.scene) {
			const sourceChara = getChara(sourceUnit.id);
			const moraleBarPos = getMoraleBarPosition(targetForce.id);
			if (sourceChara && moraleBarPos) {
				// Dynamically import MoraleDisplay to get bar width
				const targetX = moraleBarPos.x + MORALE_BAR_WIDTH / 2;
				const targetY = moraleBarPos.y;
				const { arcaneMissileTargeted } = await import('../../../Effects/arcaneMissileTargeted');
				arcaneMissileTargeted(
					context.scene,
					{ x: sourceChara.x, y: sourceChara.y },
					{ x: targetX, y: targetY },
					{
						colors: [0xff0000, 0xb22222, 0xdc143c], // Red colors
						amplitudeMin: 5,
						amplitudeMax: 15,
						particleScale: 1.5,
						impact: {
							colors: [0xff0000, 0xb22222],
							scale: 2,
							speed: 200,
							lifespan: 300,
							alpha: 0.4
						},
						onHit: async () => {
							dealDamage(targetForce, damageAmount, context.scene, 0);
						}
					}
				);
			} else {
				// Fallback: just apply damage directly
				dealDamage(targetForce, damageAmount, context.scene, 0);
			}
		} else {
			// Fallback: just apply damage directly
			dealDamage(targetForce, damageAmount, context.scene, 0);
		}

		// Battle reactions are now handled centrally in the combat loop
		// No need to manually trigger allied reactions here

	};
}

/**
 * Deal damage effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const dealDamageLogicIO: TraitEffectFn = async (context) => {

	const { scene } = context;

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_ATTACK,
			{ unit, amount }
		);
	}

	const impl = createDealDamageLogic(emitter, applyDamageToForce);
	return impl(context);
};
