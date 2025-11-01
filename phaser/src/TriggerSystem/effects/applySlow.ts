import { arcaneMissileTargeted } from '../../Effects/arcaneMissileTargeted';
import { slowEffect } from '../../Effects/slowEffect';
import { getCharaById } from '@Systems/Chara/Chara';
import { Unit } from '@Models/Entities/Unit';

export async function applySlowLogicIO(sourceUnit: Unit, targets: Unit[], duration: number) {

	for (const target of targets) {
		const targetChara = getCharaById(target.id);
		arcaneMissileTargeted(
			getCharaById(sourceUnit.id),
			targetChara,
			{
				colors: [0xD2691E, 0xCD853F, 0xF4A460], // Orange-brownish colors: saddle brown, peru, sandy brown
				amplitudeMin: 5,
				amplitudeMax: 20,
				particleScale: 1.5,
				impact: {
					colors: [0xD2691E, 0xCD853F],
					scale: 2,
					speed: 200,
					lifespan: 300,
					alpha: 0.4
				},
				onHit: async () => {
					target.slowed += duration;

					slowEffect(targetChara, {
						duration: 1000,
						intensity: 1.5,
						color: 0xD2691E // Orange-brownish color matching the projectile
					});
				}
			}
		);
	}
};

