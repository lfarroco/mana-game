import { Unit } from '@Models/Entities/Unit';
import { arcaneMissileTargeted } from '../../Effects';
import { getMoraleBarTipPosition } from '@Scenes//Battleground/MoraleDisplay';
import { getCharaById } from '@Systems/Chara/Chara';
import { scene } from '@Scenes//Battleground/BattlegroundScene';
import { applyPoison } from '@Scenes//Battleground/Systems/PoisonDamageSystem';

export const applyPoisonLogicIO = async (sourceUnit: Unit) => {

	const amount = sourceUnit.power * 0.1;

	const targetForce = scene.state.battleData.forces.find(force => force.id !== sourceUnit.force);

	console.log(`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`);

	if (!targetForce) {
		console.warn('[ApplyPoison] No target force found');
		return;
	}

	const sourceChara = getCharaById(sourceUnit.id);
	const moraleBarTipPos = getMoraleBarTipPosition(targetForce.id);

	arcaneMissileTargeted(
		scene,
		sourceChara,
		moraleBarTipPos,
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
