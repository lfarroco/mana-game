import { getAlliedCore } from '@Models/Entities/Card';
import { Unit } from '@Models/Entities/Unit';
import { getState } from '@Models/State';
import { applyRegen } from '@Scenes//Battleground/Systems/RegenSystem';
import { getCharaById } from '@Systems/Chara/Chara';
import { arcaneMissileTargeted } from '../../Effects';

export const applyRegenLogicIO = async (sourceUnit: Unit) => {

	const amount = sourceUnit.power * 0.1;

	const targetForce = getState().battleData.forces.find(force => force.id === sourceUnit.force)!;

	console.log(`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen rate: ${amount}, Total healing over time: ${amount * 10}`);

	const effect = () => {
		applyRegen(targetForce, amount, sourceUnit.id);
	}

	const alliedCore = getAlliedCore(sourceUnit.force);

	arcaneMissileTargeted(
		getCharaById(sourceUnit.id),
		getCharaById(alliedCore.id),
		{
			colors: [0x00ff00, 0x32cd32, 0x7fff00, 0x00ff00], //dark green tones
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
			onHit: effect
		}
	);
};
