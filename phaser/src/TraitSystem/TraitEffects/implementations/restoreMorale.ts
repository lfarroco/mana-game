/**
 * @file Restore Morale trait effect implementation
 * This effect restores morale to the source unit's force and shows healing pop text.
 */

import { GameEvents } from '../../../constants/events';
import { Force, manipulateForceMorale } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
import { getChara } from '../../../Scenes/Battleground/Systems/CharaManager';
import { TraitEffectFn } from '../../TraitEffectSystem';
import { processUnitTraitsForEvent } from '../../Traits';

/**
 * Pure function to create the restore morale effect implementation
 * @returns The trait effect function
 */
export function createRestoreMoraleLogic(
	emitter: (unit: Unit, amount: number) => void,
	healMorale: (targetForce: Force, amount: number, scene: Phaser.Scene) => void
): TraitEffectFn {
	return async (context) => {
		const { sourceUnit } = context;

		// Use unit's power as heal amount
		const healAmount = sourceUnit.power;

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

	const { scene, sourceUnit } = context;

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_MORALE_RESTORED,
			{ unit, amount }
		);
	}

	const impl = createRestoreMoraleLogic(emitter, manipulateForceMorale);
	await impl(context);

	// Process ally traits that trigger on "onAlliedAction" when this unit heals
	context.state.battleData.units.forEach((unit) => {
		const isAllied = unit.force === sourceUnit.force;
		if (!isAllied || unit.id === sourceUnit.id) return; // Skip non-allies and self

		// Process traits for allies that react to allied healing
		// We'll temporarily store the triggering trait info in the scene for condition checking
		const originalTriggerContext = (context.scene as any)._currentTriggerContext;
		(context.scene as any)._currentTriggerContext = {
			triggeringTraitId: context.traitInstanceParams.id,
			triggeringUnitId: sourceUnit.id,
			triggeringAction: 'heal',
			triggeringActionId: 'heal'
		};

		processUnitTraitsForEvent(unit, "onAlliedAction", context.scene, context.state);

		// Restore original context
		(context.scene as any)._currentTriggerContext = originalTriggerContext;
	});
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
	// Use unit's power as amount instead of configurable parameters
	const amount = context.sourceUnit.power;

	const { scene, state, sourceUnit } = context;
	const targetForce = state.battleData.forces.find(f => f.id === sourceUnit.force);

	if (targetForce) {
		// Use the shared utility function that handles morale damage reduction
		const actualChange = manipulateForceMorale(targetForce, amount, scene);

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
