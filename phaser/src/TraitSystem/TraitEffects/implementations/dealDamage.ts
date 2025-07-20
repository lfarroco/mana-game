/**
 * @file Deal Damage trait effect implementation
 * This effect deals direct damage to targets and shows damage pop text.
 */

import { GameEvents } from '../../../constants/events';
import { Force, applyDamageToForce } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
import { TraitEffectFn, setupAlliedReactions } from '../../TraitEffectSystem';
import { processUnitTraitsForEvent } from '../../Traits';

/**
 * Pure function to create the deal damage effect implementation
 * @returns The trait effect function
 */
export function createDealDamageLogic(
	emitter: (unit: Unit, amount: number) => void,
	dealDamage: (targetForce: Force, damage: number, scene: Phaser.Scene) => void
): TraitEffectFn {
	return async (context) => {
		const { sourceUnit } = context;

		// Use unit's power as damage amount
		const damageAmount = sourceUnit.power;

		emitter(sourceUnit, damageAmount);

		const targetForce = context.state.battleData.forces.find(
			(force) => force.id !== sourceUnit.force
		)!;

		dealDamage(targetForce, damageAmount, context.scene);

		// Process ally traits that trigger on "onAlliedAction" when this unit attacks
		// Get source_selector parameter from trait instance to determine which allies can react (defaults to 'all_allies')
		const sourceSelector = context.traitInstanceParams.source_selector || 'all_allies';

		// Use the helper function to set up allied reactions with configurable source targeting
		const processReactions = setupAlliedReactions(
			sourceUnit,
			context.traitInstanceParams.id,
			'attack',
			'damage',
			sourceSelector,
			context.scene,
			context.state
		);

		// Execute the reactions
		processReactions(processUnitTraitsForEvent);

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
