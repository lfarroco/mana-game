/**
 * @file Deal Damage trait effect implementation
 * This effect deals direct damage to targets and shows damage pop text.
 */

import { GameEvents } from '../../../constants/events';
import { Force, applyDamageToForce } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
import { TraitEffectFn } from '../../TraitEffectSystem';
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
		context.state.battleData.units.forEach((unit) => {
			const isAllied = unit.force === sourceUnit.force;
			if (!isAllied || unit.id === sourceUnit.id) return; // Skip non-allies and self

			// Process traits for allies that react to allied attacks
			// We'll temporarily store the triggering trait info in the scene for condition checking
			const originalTriggerContext = (context.scene as any)._currentTriggerContext;
			(context.scene as any)._currentTriggerContext = {
				triggeringTraitId: context.traitInstanceParams.id,
				triggeringUnitId: sourceUnit.id,
				triggeringAction: 'attack'
			};

			processUnitTraitsForEvent(unit, "onAlliedAction", context.scene, context.state);

			// Restore original context
			(context.scene as any)._currentTriggerContext = originalTriggerContext;
		});

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
