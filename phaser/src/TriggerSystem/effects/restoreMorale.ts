/**
 * @file Restore Morale trait effect implementation
 * This effect restores morale to the source unit's force and shows healing pop text.
 */

import { arcaneMissileTargeted } from "../../Effects";
import { Force, manipulateForceMorale } from "../../Models/Entities/Force";
import { Unit } from "../../Models/Entities/Unit";
import { scene } from "../../Scenes/Battleground/BattlegroundScene";
import { getMoraleBarTipPosition } from "../../Scenes/Battleground/MoraleDisplay";
import * as CombatStatsTracker from "../../Scenes/Battleground/Systems/CombatStatsTracker";
import { getChara } from "../../Scenes/Battleground/Systems/CharaManager";

/**
 * Pure function to create the restore morale effect implementation
 * @returns The trait effect function
 */
export function createRestoreMoraleLogic(
	emitter: (unit: Unit, amount: number) => void,
	healMorale: (targetForce: Force, amount: number) => void
) {
	return async (context: { sourceUnit: Unit; }) => {
		const { sourceUnit } = context;

		const healAmount = sourceUnit.power;

		emitter(sourceUnit, healAmount);

		const sourceForce = scene.state.battleData.forces.find(
			(force: { id: string }) => force.id === sourceUnit.force
		)!;

		// Show a green projectile from source unit to own morale bar tip
		const sourceChara = getChara(sourceUnit.id);
		// Target the current tip of the morale bar for more accurate visual feedback
		const moraleBarTipPos = getMoraleBarTipPosition(sourceForce.id);
		if (sourceChara && moraleBarTipPos) {
			arcaneMissileTargeted(
				scene,
				{ x: sourceChara.x, y: sourceChara.y },
				{ x: moraleBarTipPos.x, y: moraleBarTipPos.y },
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
						healMorale(sourceForce, healAmount);
					}
				}
			);
		} else {
			// Fallback: just apply healing directly
			healMorale(sourceForce, healAmount);
		}
	};
}

/**
 * Restore morale effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const restoreMoraleLogicIO = async (context: { sourceUnit: Unit }) => {

	const { sourceUnit } = context;

	const emitter = (unit: Unit, amount: number) => {
		CombatStatsTracker.trackMoraleRestored({
			unit,
			amount,
			type: 'direct',
			sourceUnitId: sourceUnit.id
		})
	}

	// Enhanced heal function that also reduces poison and tracks stats
	const healMoraleWithPoisonReduction = (targetForce: Force, amount: number): number => {
		// Apply the healing
		const actualHealing = manipulateForceMorale(targetForce, amount);

		// Track healing in combat stats using singleton
		if (actualHealing > 0) {
			CombatStatsTracker.trackHealing(sourceUnit.id, actualHealing, 'direct');
		}

		// Reduce poison based on healing amount (2.5 poison reduction per 10 healing)
		const runCombatSystem = scene.runCombatSystem;
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