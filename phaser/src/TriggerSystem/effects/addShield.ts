import { arcaneMissileTargeted } from '../../Effects';
import { Force, manipulateForceShield } from '../../Models/Entities/Force';
import { Unit } from '../../Models/Entities/Unit';
import { scene } from '../../Scenes/Battleground/BattlegroundScene';
import { getShieldBarTipPosition } from '../../Scenes/Battleground/MoraleDisplay';
import * as CombatStatsTracker from '../../Scenes/Battleground/Systems/CombatStatsTracker';
import { getChara } from '../../Scenes/Battleground/Systems/CharaManager';

export function createAddShieldLogic(
	emitter: (unit: Unit, amount: number) => void,
	addShield: (targetForce: Force, amount: number, scene: Phaser.Scene) => void
) {
	return async (sourceUnit: Unit) => {

		const shieldAmount = sourceUnit.power;

		emitter(sourceUnit, shieldAmount);

		const sourceForce = scene.state.battleData.forces.find(
			(force) => force.id === sourceUnit.force
		)!;

		const sourceChara = getChara(sourceUnit.id);
		const shieldBarTipPos = getShieldBarTipPosition(sourceForce.id);

		arcaneMissileTargeted(
			scene,
			sourceChara.container,
			shieldBarTipPos,
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

export const addShieldLogicIO = async (sourceUnit: Unit) => {

	const emitter = (unit: Unit, amount: number) => {
		CombatStatsTracker.trackShieldGained({
			unit,
			amount,
			sourceUnitId: sourceUnit.id
		});
	}

	const addShieldWithTracking = (targetForce: Force, amount: number): number => {
		const actualShieldChange = manipulateForceShield(targetForce, amount);

		if (actualShieldChange > 0) {
			CombatStatsTracker.trackShield(sourceUnit.id, actualShieldChange);
		}

		return actualShieldChange;
	};

	const impl = createAddShieldLogic(emitter, addShieldWithTracking);
	await impl(sourceUnit);

};
