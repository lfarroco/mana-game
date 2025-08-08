/**
 * @file Apply Poison trait effect implementation
 * This effect applies poison to enemy forces, causing damage over time.
 */

import { GameEvents } from '../../constants/events';
import { Force } from '../../Models/Entities/Force';
import { Unit } from '../../Models/Entities/Unit';
import { arcaneMissileTargeted } from '../../Effects';
import { getMoraleBarPosition, MORALE_BAR_WIDTH } from '../../Scenes/Battleground/MoraleDisplay';
import { getChara } from '../../Scenes/Battleground/Systems/CharaManager';
import BattlegroundScene from '../../Scenes/Battleground/BattlegroundScene';

/**
 * Pure function to create the apply poison effect implementation
 * @returns The trait effect function
 */
export function createApplyPoisonLogic(
	emitter: (unit: Unit, amount: number) => void,
	applyPoison: (targetForce: Force, amount: number, sourceUnitId?: string) => void
) {
	return async (context: { scene: BattlegroundScene; sourceUnit: Unit; amount: number }) => {
		const { sourceUnit, scene, amount } = context;

		const targetForce = scene.state.battleData.forces.find(force => force.id !== sourceUnit.force);

		console.log(`[ApplyPoison] Unit power: ${sourceUnit.power}, Initial poison: ${amount}, Total damage over time: ${amount}`);

		emitter(sourceUnit, amount);

		if (!targetForce) {
			console.warn('[ApplyPoison] No target force found');
			return;
		}

		// Show a purple projectile from source unit to enemy morale bar
		const sourceChara = getChara(sourceUnit.id);
		const moraleBarPos = getMoraleBarPosition(targetForce.id);
		if (!sourceChara || !moraleBarPos) {
			console.warn('[ApplyPoison] Source character or morale bar position not found');
			return;
		}

		const targetX = moraleBarPos.x + MORALE_BAR_WIDTH / 2;
		const targetY = moraleBarPos.y;
		arcaneMissileTargeted(
			context.scene,
			{ x: sourceChara.x, y: sourceChara.y },
			{ x: targetX, y: targetY },
			{
				colors: [0x9932cc, 0x8a2be2, 0x663399], // Purple colors for poison
				speedMultiplier: 1.5,
				amplitudeMin: 3,
				amplitudeMax: 12,
				particleScale: 1.2,
				impact: {
					colors: [0x9932cc, 0x8a2be2],
					scale: 2,
					speed: 180,
					lifespan: 400,
					alpha: 0.6
				},
				onHit: async () => {
					applyPoison(targetForce, amount, sourceUnit.id);
				}
			}
		);


	};
}

/**
 * Apply poison effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const applyPoisonLogicIO = async (context: {
	scene: BattlegroundScene;
	sourceUnit: Unit;
	amount: number;
}) => {
	const { scene } = context;

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_ATTACK, // Reuse attack event for poison application
			{ unit, amount, type: 'poison' }
		);
	};

	// Get the poison system from the scene
	const poisonSystem = scene.runCombatSystem?.getPoisonDamageSystem();
	if (!poisonSystem) {
		console.warn('[ApplyPoison] PoisonDamageSystem not found on scene');
		return;
	}

	const applyPoison = (targetForce: Force, amount: number, sourceUnitId?: string) => {
		poisonSystem.applyPoison(targetForce, amount, sourceUnitId);
	};

	const impl = createApplyPoisonLogic(emitter, applyPoison);
	return impl(context);
};
