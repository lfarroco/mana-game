/**
 * @file Add Shield trait effect implementation
 * This effect adds shield to the source unit's force and shows shield pop text.
 */

import { GameEvents } from '../../constants/events';
import { arcaneMissileTargeted } from '../../Effects';
import { Force, manipulateForceShield } from '../../Models/Entities/Force';
import { Unit } from '../../Models/Entities/Unit';
import BattlegroundScene from '../../Scenes/Battleground/BattlegroundScene';
import { getMoraleBarPosition, MORALE_BAR_WIDTH } from '../../Scenes/Battleground/MoraleDisplay';
import * as CombatStatsTracker from '../../Scenes/Battleground/Systems/CombatStatsTracker';
import { getChara } from '../../Scenes/Battleground/Systems/CharaManager';

/**
 * Pure function to create the add shield effect implementation
 * @returns The trait effect function
 */
export function createAddShieldLogic(
	emitter: (unit: Unit, amount: number) => void,
	addShield: (targetForce: Force, amount: number, scene: Phaser.Scene) => void
) {
	return async ({ scene, sourceUnit }: { scene: BattlegroundScene; sourceUnit: Unit; }) => {

		const shieldAmount = sourceUnit.power;

		emitter(sourceUnit, shieldAmount);

		const sourceForce = scene.state.battleData.forces.find(
			(force) => force.id === sourceUnit.force
		)!;

		// Show a yellow/gold projectile from source unit to own shield bar
		const sourceChara = getChara(sourceUnit.id);
		const moraleBarPos = getMoraleBarPosition(sourceForce.id);

		if (!sourceChara || !moraleBarPos) {
			return;
		}

		const targetX = moraleBarPos.x + MORALE_BAR_WIDTH / 2;
		const targetY = moraleBarPos.y;
		arcaneMissileTargeted(
			scene,
			{ x: sourceChara.x, y: sourceChara.y },
			{ x: targetX, y: targetY },
			{
				colors: [0xffd700, 0xffe135, 0xfff8dc], // Gold/yellow colors
				amplitudeMin: 5,
				amplitudeMax: 15,
				particleScale: 1.5,
				impact: {
					colors: [0xffd700, 0xffe135],
					scale: 2,
					speed: 200,
					lifespan: 300,
					alpha: 0.4
				},
				onHit: async () => {
					addShield(sourceForce, shieldAmount, scene);
				}
			}
		);
	};
}

/**
 * Add shield effect implementation for runtime use
 * This is the actual implementation registered with the TraitEffectSystem
 */
export const addShieldLogicIO = async ({ scene, sourceUnit }: { scene: BattlegroundScene; sourceUnit: Unit; }) => {

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_SHIELD_GAINED,
			{ unit, amount, sourceUnitId: sourceUnit.id }
		);
	}

	// Create a wrapper for manipulateForceShield that tracks combat stats
	const addShieldWithTracking = (targetForce: Force, amount: number, scene: Phaser.Scene): number => {
		const actualShieldChange = manipulateForceShield(targetForce, amount, scene);

		// Track shield in combat stats using singleton
		if (actualShieldChange > 0) {
			CombatStatsTracker.trackShield(sourceUnit.id, actualShieldChange);
		}

		return actualShieldChange;
	};

	const impl = createAddShieldLogic(emitter, addShieldWithTracking);
	await impl({ scene, sourceUnit });

	// Battle reactions are now handled centrally in the combat loop
	// No need to manually trigger allied reactions here
};
