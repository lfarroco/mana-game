/**
 * @file Deal Damage trait effect implementation
 * This effect deals direct damage to targets and shows damage pop text.
 */

import { GameEvents } from '../../../constants/events';
import { Force, applyDamageToForce } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
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


		// TODO: shield pieces logic
		// Check if the unit has shield piercing trait
		// let shieldPiercingPercentage = 0;
		// const shieldPiercingTrait = sourceUnit.traits.find(trait => trait.id === 'shield_piercing');
		// if (shieldPiercingTrait) {
		// 	shieldPiercingPercentage = getEffectParams(shieldPiercingTrait, {}, 'percentage', 0);
		// }

		dealDamage(targetForce, damageAmount, context.scene, 0);

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
