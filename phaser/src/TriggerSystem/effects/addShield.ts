import { getAlliedCore } from '@Models/Entities/Card';
import { manipulateForceShield } from '@Models/Entities/Force';
import { Unit } from '@Models/Entities/Unit';
import { getState } from '@Models/State';
import * as CombatStatsTracker from '@Scenes//Battleground/Systems/CombatStatsTracker';
import { getCharaById } from '@Systems/Chara/Chara';
import { arcaneMissileTargeted } from '../../Effects';

export const addShieldLogicIO = async (sourceUnit: Unit) => {

	const shieldAmount = sourceUnit.power;

	// TODO: what's different from trackShield?
	CombatStatsTracker.trackShieldGained({
		unit: sourceUnit,
		amount: shieldAmount,
		sourceUnitId: sourceUnit.id
	});

	const sourceForce = getState().battleData.forces.find(
		(force) => force.id === sourceUnit.force
	)!;
	const alliedCore = getAlliedCore(sourceUnit.force);

	arcaneMissileTargeted(
		getCharaById(sourceUnit.id),
		getCharaById(alliedCore.id),
		{
			colors: [0x00ff00, 0x32cd32, 0x7fff00],//golden tones
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
				const actualShieldChange = manipulateForceShield(sourceForce, shieldAmount);

				if (actualShieldChange > 0) {
					CombatStatsTracker.trackShield(sourceUnit.id, actualShieldChange);
				}
			}
		}
	);

};
