import { arcaneMissileTargeted } from '../../Effects';
import { Force, applyDamageToForce } from '@Models/Entities/Force';
import { Unit } from '@Models/Entities/Unit';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import { getMoraleBarTipPosition, getShieldBarTipPosition } from '@Scenes//Battleground/MoraleDisplay';
import { getCharaById } from '@Systems/Chara/Chara';
import * as CombatStatsTracker from '@Scenes//Battleground/Systems/CombatStatsTracker';

export function createDealDamageLogic(
	dealDamage: (targetForce: Force, damage: number, scene: Phaser.Scene) => number
) {
	return async (sourceUnit: Unit) => {

		let damageAmount = sourceUnit.power;

		const targetForce = scene.state.battleData.forces.find(
			(force: { id: string }) => force.id !== sourceUnit.force
		)!;

		const sourceChara = getCharaById(sourceUnit.id);

		const targetPos = targetForce.shield > 0
			? getShieldBarTipPosition(targetForce.id)
			: getMoraleBarTipPosition(targetForce.id);

		arcaneMissileTargeted(
			scene,
			sourceChara,
			targetPos,
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

	};
}

export const dealDamageLogicIO = async (sourceUnit: Unit) => {
	const dealDamageWithTracking = (targetForce: Force, damage: number): number => {
		const actualMoraleChange = applyDamageToForce(targetForce, damage);

		CombatStatsTracker.trackDamage(sourceUnit.id, actualMoraleChange, 'normal');

		return actualMoraleChange;
	};

	const impl = createDealDamageLogic(dealDamageWithTracking);
	return impl(sourceUnit);
};
