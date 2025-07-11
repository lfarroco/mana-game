/**
 * @file Add Shield trait effect implementation
 * This effect adds shield to the source unit's force and shows shield pop text.
 */

import { GameEvents } from '../../../constants/events';
import { Force, manipulateForceShield } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
import { TraitEffectFn } from '../../TraitEffectSystem';

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

	const { scene } = context;

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_SHIELD_GAINED,
			{ unit, amount }
		);
	}

	const impl = createAddShieldLogic(emitter, manipulateForceShield);
	return impl(context);
};
