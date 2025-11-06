import { Unit } from "@Models/Entities/Unit";
import * as AudioManager from "@Systems/AudioManager";
import { getCharaById, updateUnitCritical } from "@Systems/Chara/Chara";
import { arcaneMissileTargeted } from '../../Effects';

export const increaseCritical = async (
	targets: Unit[],
	amount: number,
	sourceUnit?: Unit // sources like orbs apply direct critical increase
) => {

	const effect = (target: string) => async () => {

		const targetChara = getCharaById(target);
		updateUnitCritical(targetChara, amount);
		AudioManager.playSoundEffect('sfx_spell_innerfocus');
	}

	if (!sourceUnit) {
		for (const target of targets) {
			effect(target.id)();
		}
		return;
	}

	// Use projectile animation when sourceUnit is provided
	const sourceChara = getCharaById(sourceUnit.id);

	for (const target of targets) {
		const targetChara = getCharaById(target.id);

		arcaneMissileTargeted(
			sourceChara,
			targetChara,
			{
				colors: [0xffa500, 0xff8c00, 0xff4500], // Orange colors
				amplitudeMin: 5,
				amplitudeMax: 15,
				particleScale: 1.5,
				impact: {
					colors: [0xffa500, 0xff8c00],
					scale: 2,
					speed: 200,
					lifespan: 300,
					alpha: 0.4
				},
				onHit: effect(target.id)
			}
		);
	}

};
