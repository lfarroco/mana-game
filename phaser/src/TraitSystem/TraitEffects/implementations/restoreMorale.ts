/**
 * @file Restore Morale trait effect implementation
 * This effect restores morale to the source unit's force and shows healing pop text.
 */

import { GameEvents } from '../../../constants/events';
import { arcaneMissileTargeted } from '../../../Effects';
import { Force, manipulateForceMorale } from '../../../Models/Entities/Force';
import { Unit } from '../../../Models/Entities/Unit';
import { getMoraleBarPosition, MORALE_BAR_WIDTH } from '../../../Scenes/Battleground/MoraleDisplay';
import { getChara } from '../../../Scenes/Battleground/Systems/CharaManager';
import { TraitEffectFn } from '../../TraitEffectSystem';

/**
 * Pure function to create the restore morale effect implementation
 * @returns The trait effect function
 */
export function createRestoreMoraleLogic(
	emitter: (unit: Unit, amount: number) => void,
	healMorale: (targetForce: Force, amount: number, scene: Phaser.Scene) => void
): TraitEffectFn {
	return async (context) => {
		const { sourceUnit, effectInstance, traitInstanceParams } = context;

		// Use trait 'amount' if present, otherwise fallback to unit's power
		const healAmount = effectInstance.amount ?? traitInstanceParams.amount ?? sourceUnit.power;

		emitter(sourceUnit, healAmount);

		const sourceForce = context.state.battleData.forces.find(
			(force) => force.id === sourceUnit.force
		)!;

		// Show a green projectile from source unit to own morale bar
		if (context.scene) {
			const sourceChara = getChara(sourceUnit.id);
			// Dynamically import MoraleDisplay to get bar position and width
			const moraleBarPos = getMoraleBarPosition(sourceForce.id);
			if (sourceChara && moraleBarPos) {
				const targetX = moraleBarPos.x + MORALE_BAR_WIDTH / 2;
				const targetY = moraleBarPos.y;
				arcaneMissileTargeted(
					context.scene,
					{ x: sourceChara.x, y: sourceChara.y },
					{ x: targetX, y: targetY },
					{
						colors: [0x00ff00, 0x32cd32, 0x7fff00], // Green colors
						amplitudeMin: 5,
						amplitudeMax: 15,
						particleScale: 1.5,
						impact: {
							colors: [0x00ff00, 0x32cd32],
							scale: 2,
							speed: 200,
							lifespan: 300,
							alpha: 0.4
						},
						onHit: async () => {
							healMorale(sourceForce, healAmount, context.scene);
						}
					}
				);
			} else {
				// Fallback: just apply healing directly
				healMorale(sourceForce, healAmount, context.scene);
			}
		} else {
			// Fallback: just apply healing directly
			healMorale(sourceForce, healAmount, context.scene);
		}
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

	// Enhanced heal function that also reduces poison
	const healMoraleWithPoisonReduction = (targetForce: Force, amount: number, scene: Phaser.Scene) => {
		// Apply the healing
		const actualHealing = manipulateForceMorale(targetForce, amount, scene);

		// Reduce poison based on healing amount (2.5 poison reduction per 10 healing)
		const runCombatSystem = (scene as any).runCombatSystem;
		if (runCombatSystem && actualHealing > 0) {
			runCombatSystem.reducePoison(targetForce.id, actualHealing);
		}

		return actualHealing;
	};

	const impl = createRestoreMoraleLogic(emitter, healMoraleWithPoisonReduction);
	await impl(context);

	// Battle reactions are now handled centrally in the combat loop
	// No need to manually trigger allied reactions here
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
