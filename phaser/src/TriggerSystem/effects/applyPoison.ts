/**
 * @file Apply Poison trait effect implementation
 * This effect applies poison to enemy forces, causing damage over time.
 */

import { Force } from '../../Models/Entities/Force';
import { Unit } from '../../Models/Entities/Unit';
import { arcaneMissileTargeted } from '../../Effects';
import { getMoraleBarTipPosition } from '../../Scenes/Battleground/MoraleDisplay';
import { getChara } from '../../Scenes/Battleground/Systems/CharaManager';
import BattlegroundScene from '../../Scenes/Battleground/BattlegroundScene';
import { applyPoison } from '../../Scenes/Battleground/Systems/PoisonDamageSystem';

/**
 * Pure function to create the apply poison effect implementation
 * @returns The trait effect function
 */
export function createApplyPoisonLogic(
	applyPoison: (targetForce: Force, amount: number, sourceUnitId?: string) => void
) {
	return async (context: { scene: BattlegroundScene; sourceUnit: Unit; amount: number }) => {
		const { sourceUnit, scene, amount } = context;

		const targetForce = scene.state.battleData.forces.find(force => force.id !== sourceUnit.force);

		console.log(`[ApplyPoison] Unit power: ${sourceUnit.power}, Initial poison: ${amount}, Total damage over time: ${amount}`);

		if (!targetForce) {
			console.warn('[ApplyPoison] No target force found');
			return;
		}

		// Show a purple projectile from source unit to enemy morale bar tip
		const sourceChara = getChara(sourceUnit.id);
		const moraleBarTipPos = getMoraleBarTipPosition(targetForce.id);
		if (!sourceChara || !moraleBarTipPos) {
			console.warn('[ApplyPoison] Source character or morale bar tip position not found');
			return;
		}

		arcaneMissileTargeted(
			context.scene,
			{ x: sourceChara.x, y: sourceChara.y },
			{ x: moraleBarTipPos.x, y: moraleBarTipPos.y },
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
	const impl = createApplyPoisonLogic(applyPoison);
	return impl(context);
};
