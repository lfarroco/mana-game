/**
 * @file Add Shield trait effect implementation
 * This effect adds shield to the source unit's force and shows shield pop text.
 */

import { GameEvents } from '../../../constants/events';
import { Force, manipulateForceShield } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
import { TraitEffectFn, setupAlliedReactions } from '../../TraitEffectSystem';
import { processUnitTraitsForEvent } from '../../Traits';
import { getEffectParams } from '../../TraitSystem.pure';

/**
 * Pure function to create the add shield effect implementation
 * @returns The trait effect function
 */
export function createAddShieldLogic(
	emitter: (unit: Unit, amount: number) => void,
	addShield: (targetForce: Force, amount: number, scene: Phaser.Scene) => void
): TraitEffectFn {
	return async (context) => {
		const { sourceUnit } = context;

		// Use unit's power as shield amount
		const shieldAmount = sourceUnit.power;

		emitter(sourceUnit, shieldAmount);

		const sourceForce = context.state.battleData.forces.find(
			(force) => force.id === sourceUnit.force
		)!;

		addShield(sourceForce, shieldAmount, context.scene);
	};
}

/**
 * Add shield effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const addShieldLogicIO: TraitEffectFn = async (context) => {

	const { scene, sourceUnit } = context;

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_SHIELD_GAINED,
			{ unit, amount }
		);
	}

	const impl = createAddShieldLogic(emitter, manipulateForceShield);
	await impl(context);

	// Process ally traits that trigger on "onAlliedAction" when this unit shields
	// Get source_selector parameter to determine which allies can react (defaults to 'all_allies')
	const sourceSelector = getEffectParams(context.traitInstanceParams, context.effectInstance, 'source_selector', 'all_allies');

	// Use the helper function to set up allied reactions with configurable source targeting
	const processReactions = setupAlliedReactions(
		sourceUnit,
		context.traitInstanceParams.id,
		'buff',
		'shield',
		sourceSelector,
		context.scene,
		context.state
	);

	// Execute the reactions
	processReactions(processUnitTraitsForEvent);
};
