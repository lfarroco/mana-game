import { arcaneMissileTargeted } from '../../Effects/arcaneMissileTargeted';
import { hasteEffect } from '../../Effects/hasteEffect';
import { Chara, getCharaById } from '@Systems/Chara/Chara';
import { Unit } from '@Models/Entities/Unit';

export const applyHasteLogicIO = async (
	targets: Unit[],
	sourceUnit: Unit,
	duration: number,
) => {
	const sourceChara = getCharaById(sourceUnit.id);

	const effect = (target: Unit, targetChara: Chara) => async () => {
		target.hasted += duration;

		hasteEffect(targetChara, {
			duration: 1000,
			intensity: 1.5,
			color: 0x00eaff
		});
	}

	for (const target of targets) {
		const targetChara = getCharaById(target.id);
		arcaneMissileTargeted(
			sourceChara,
			targetChara,
			{
				colors: [0x00FFFF, 0x87CEEB, 0xADD8E6],
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
				onHit: effect(target, targetChara)
			}
		);
	}
};
