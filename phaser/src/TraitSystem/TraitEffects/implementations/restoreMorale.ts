/**
 * @file Restore Morale trait effect implementation
 * This effect restores morale to the source unit's force and shows healing pop text.
 */

import { GameEvents } from '../../../constants/events';
import { Force, manipulateForceMorale } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
import { TraitEffectFn } from '../../TraitEffectSystem';
import { getEffectParams } from '../../TraitSystem.pure';

/**
 * Pure function to create the restore morale effect implementation
 * @returns The trait effect function
 */
export function createRestoreMoraleLogic(
	emitter: (unit: Unit, amount: number) => void,
	healMorale: (targetForce: Force, amount: number, scene: Phaser.Scene) => void
): TraitEffectFn {
	return async (context) => {
		const { sourceUnit, traitInstanceParams, effectInstance } = context;

		// Get heal amount from parameters, default to 20 if not specified
		const healAmount = getEffectParams(traitInstanceParams, effectInstance, 'amount', 20);

		emitter(sourceUnit, healAmount);

		const sourceForce = context.state.battleData.forces.find(
			(force) => force.id === sourceUnit.force
		)!;

		healMorale(sourceForce, healAmount, context.scene);
	};
}

/**
 * Restore morale effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const restoreMoraleLogicIO: TraitEffectFn = async (context) => {

	const { scene } = context;

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_MORALE_RESTORED,
			{ unit, amount }
		);
	}

	const impl = createRestoreMoraleLogic(emitter, manipulateForceMorale);
	return impl(context);
};

/**
 * Pure function logic for restoring force morale.
 * @param amount - The amount of morale to restore
 * @param sourceForceId - The ID of the force to restore morale to
 * @returns The calculated morale restoration amount
 */
export function restoreForceMoralePure(amount: number, sourceForceId: string): {
	amount: number;
	forceId: string;
} {
	return {
		amount: Math.max(0, amount), // Ensure positive restoration
		forceId: sourceForceId
	};
}

/**
 * Legacy implementation - keeping for backward compatibility
 * Runtime wrapper that handles morale restoration with scene integration.
 * This wrapper handles the Phaser scene integration and UI updates.
 */
export const restoreForceMoraleLogic: TraitEffectFn = async (context) => {
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 50);

	// Use dynamic imports to avoid circular dependencies in tests
	const [
		{ manipulateForceMorale: manipulateForceMoreale },
		{ getChara }
	] = await Promise.all([
		import("../../../Models/Entities/Force"),
		import("../../../Scenes/Battleground/Systems/CharaManager")
	]);

	const { scene, state, sourceUnit } = context;
	const targetForce = state.battleData.forces.find(f => f.id === sourceUnit.force);

	if (targetForce) {
		// Use the shared utility function that handles morale damage reduction
		const actualChange = manipulateForceMoreale(targetForce, amount, scene);

		// Show pop text for the source unit
		if (actualChange !== 0) {
			const chara = getChara(sourceUnit.id);
			if (chara && chara.active && (!scene || (scene.scene && scene.scene.isActive()))) {
				const sign = actualChange > 0 ? '+' : '';
				await chara.showPopText(`${sign}${actualChange} Morale`, actualChange > 0 ? "heal" : "damage");
			}
		}
	}
};
