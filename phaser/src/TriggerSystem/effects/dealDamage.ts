/**
 * @file Deal Damage trait effect implementation
 * This effect deals direct damage to targets and shows damage pop text.
 */

import { GameEvents } from '../../constants/events';
import { arcaneMissileTargeted } from '../../Effects';
import { Force, applyDamageToForce } from '../../Models/Entities/Force';
import { Unit } from '../../Models/Entities/Unit';
import BattlegroundScene from '../../Scenes/Battleground/BattlegroundScene';
import { getMoraleBarTipPosition, getShieldBarTipPosition } from '../../Scenes/Battleground/MoraleDisplay';
import { getChara } from '../../Scenes/Battleground/Systems/CharaManager';
import * as CombatStatsTracker from '../../Scenes/Battleground/Systems/CombatStatsTracker';

/**
 * Pure function to create the deal damage effect implementation
 * @returns The trait effect function
 */
export function createDealDamageLogic(
	emitter: (unit: Unit, amount: number) => void,
	dealDamage: (targetForce: Force, damage: number, scene: Phaser.Scene) => number
) {
	return async (context: { sourceUnit: Unit; scene: BattlegroundScene; }) => {
		const { sourceUnit, scene } = context;

		let damageAmount = sourceUnit.power;

		emitter(sourceUnit, damageAmount);

		const targetForce = scene.state.battleData.forces.find(
			(force: { id: any; }) => force.id !== sourceUnit.force
		)!;

		// Show a red projectile from source unit to the appropriate target
		// Target shield bar tip if enemy has shield, otherwise target morale bar tip
		const sourceChara = getChara(sourceUnit.id);
		if (!sourceChara) {
			// Fallback: just apply damage directly if no source character found
			dealDamage(targetForce, damageAmount, scene);
			return;
		}

		// Choose target based on whether the enemy has shield
		const targetPos = targetForce.shield > 0
			? getShieldBarTipPosition(targetForce.id)
			: getMoraleBarTipPosition(targetForce.id);

		if (!targetPos) {
			// Fallback: just apply damage directly
			dealDamage(targetForce, damageAmount, scene);
			return;
		}

		arcaneMissileTargeted(
			scene,
			{ x: sourceChara.x, y: sourceChara.y },
			{ x: targetPos.x, y: targetPos.y },
			{
				colors: [0xff0000, 0xb22222, 0xdc143c], // Red colors
				amplitudeMin: 5,
				amplitudeMax: 15,
				particleScale: 1.5,
				impact: {
					colors: [0xff0000, 0xb22222],
					scale: 2,
					speed: 200,
					lifespan: 300,
					alpha: 0.4
				},
				onHit: async () => {
					dealDamage(targetForce, damageAmount, scene);
				}
			}
		);

		// Battle reactions are now handled centrally in the combat loop
		// No need to manually trigger allied reactions here

	};
}

/**
 * Deal damage effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const dealDamageLogicIO = async (context: { scene: BattlegroundScene, sourceUnit: Unit }) => {

	const { scene, sourceUnit } = context;

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_ATTACK,
			{ unit, amount }
		);
	}

	// Create a wrapper for applyDamageToForce that tracks combat stats
	const dealDamageWithTracking = (targetForce: Force, damage: number, scene: Phaser.Scene): number => {
		const actualMoraleChange = applyDamageToForce(targetForce, damage, scene);

		// Track damage in combat stats using singleton
		CombatStatsTracker.trackDamage(sourceUnit.id, actualMoraleChange, 'normal');

		return actualMoraleChange;
	};

	const impl = createDealDamageLogic(emitter, dealDamageWithTracking);
	return impl(context);
};
