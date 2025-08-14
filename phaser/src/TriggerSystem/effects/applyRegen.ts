/**
 * @file Apply Regen trait effect implementation
 * This effect applies regeneration to friendly forces, providing healing over time.
 */

import { GameEvents } from '../../constants/events';
import { Force } from '../../Models/Entities/Force';
import { Unit } from '../../Models/Entities/Unit';
import { arcaneMissileTargeted } from '../../Effects';
import { getMoraleBarTipPosition } from '../../Scenes/Battleground/MoraleDisplay';
import { getChara } from '../../Scenes/Battleground/Systems/CharaManager';
import BattlegroundScene from '../../Scenes/Battleground/BattlegroundScene';

/**
 * Pure function to create the apply regen effect implementation
 * @returns The trait effect function
 */
export function createApplyRegenLogic(
	emitter: (unit: Unit, amount: number) => void,
	applyRegen: (targetForce: Force, amount: number, sourceUnitId?: string) => void
) {
	return async (context: { scene: BattlegroundScene; sourceUnit: Unit; amount: number }) => {
		const { sourceUnit, scene, amount } = context;

		// Apply regen to the same force (friendly effect)
		const targetForce = scene.state.battleData.forces.find(force => force.id === sourceUnit.force);

		console.log(`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen amount: ${amount}, Total healing over time: ${amount}`);

		emitter(sourceUnit, amount);

		if (!targetForce) {
			console.warn('[ApplyRegen] No target force found');
			return;
		}

		// Show a green projectile from source unit to friendly morale bar tip
		const sourceChara = getChara(sourceUnit.id);
		const moraleBarTipPos = getMoraleBarTipPosition(targetForce.id);
		if (!sourceChara || !moraleBarTipPos) {
			console.warn('[ApplyRegen] Source character or morale bar tip position not found');
			return;
		}

		arcaneMissileTargeted(
			context.scene,
			{ x: sourceChara.x, y: sourceChara.y },
			{ x: moraleBarTipPos.x, y: moraleBarTipPos.y },
			{
				colors: [0x00ff00, 0x32cd32, 0x90ee90], // Green colors for healing
				speedMultiplier: 1.2,
				amplitudeMin: 2,
				amplitudeMax: 8,
				particleScale: 1.0,
				impact: {
					colors: [0x00ff00, 0x32cd32],
					scale: 1.8,
					speed: 150,
					lifespan: 350,
					alpha: 0.7
				},
				onHit: async () => {
					applyRegen(targetForce, amount, sourceUnit.id);
				}
			}
		);
	};
}

/**
 * Apply regen effect implementation for runtime use
 * This is the actual implementation registered with the TriggerSystem
 */
export const applyRegenLogicIO = async (context: {
	scene: BattlegroundScene;
	sourceUnit: Unit;
	amount: number;
}) => {
	const { scene } = context;

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_MORALE_RESTORED, // Use morale restored event for regen application
			{ unit, amount, type: 'regen' }
		);
	};

	// Get the regen system from the scene - we'll need to add this to the combat system
	// For now, let's assume it will be available similar to poison system
	const regenSystem = (scene.runCombatSystem as any)?.getRegenSystem?.();
	if (!regenSystem) {
		console.warn('[ApplyRegen] RegenSystem not found on scene - system may not be integrated yet');
		return;
	}

	const applyRegen = (targetForce: Force, amount: number, sourceUnitId?: string) => {
		regenSystem.applyRegen(targetForce, amount, sourceUnitId);
	};

	const impl = createApplyRegenLogic(emitter, applyRegen);
	return impl(context);
};
