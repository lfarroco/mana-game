import { getEnemyCore } from '@Models/Entities/Card';
import { getEnemyForce } from '@Models/Entities/Force';
import { isCritical, Unit } from '@Models/Entities/Unit';
import { applyPoison } from '@Scenes//Battleground/Systems/PoisonDamageSystem';
import { getCharaById } from '@Systems/Chara/Chara';
import { arcaneMissileTargeted } from '../../Effects';

export const applyPoisonLogicIO = async (sourceUnit: Unit) => {

	const baseAmount = sourceUnit.power * 0.1;

	const isCritical_ = isCritical(sourceUnit);

	const amount = isCritical_ ? baseAmount * 2 : baseAmount;

	const targetForce = getEnemyForce(sourceUnit.id);

	console.log(`[ApplyPoison] Unit power: ${sourceUnit.power}, Poison rate: ${amount}, Total damage over time: ${amount * 10}`);

	const effect = () => applyPoison(targetForce, amount, sourceUnit.id, isCritical_);

	arcaneMissileTargeted(
		getCharaById(sourceUnit.id),
		getCharaById(getEnemyCore(sourceUnit.force).id),
		{
			colors: [0x8A2BE2, 0x9932CC, 0x800080], //purple tones
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0x00FFFF, 0x87CEEB],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4
			},
			onHit: effect
		}
	);
};
