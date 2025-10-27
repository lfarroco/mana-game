import { arcaneMissileTargeted } from '../../Effects/arcaneMissileTargeted';
import { hasteEffect } from '../../Effects/hasteEffect';
import { getCharaById } from '@Systems/Chara/Chara';
import { Unit } from '@Models/Entities/Unit';
import { scene } from '@Scenes//Battleground/BattlegroundScene';

export const applyHasteLogicIO = async (context: {
	targets: Unit[];
	sourceUnit: Unit;
	duration: number;
}) => {
	const { targets, sourceUnit, duration } = context;

	const sourceChara = getCharaById(sourceUnit.id);

	for (const target of targets) {
		const targetChara = getCharaById(target.id);
		if (targetChara) {
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
					onHit: async () => {
						target.hasted += duration;

						hasteEffect(scene, targetChara, {
							duration: 1000,
							intensity: 1.5,
							color: 0x00eaff
						});
					}
				}
			);
		}
	}
};
