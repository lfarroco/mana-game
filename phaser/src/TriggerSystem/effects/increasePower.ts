import { Unit } from "@Models/Entities/Unit";
import * as AudioManager from "@Systems/AudioManager";
import { Chara, getCharaById, updateUnitPower } from "@Systems/Chara/Chara";
import { arcaneMissileTargeted } from "../../Effects";

export const increasePower = async (
	targets: Unit[],
	amount: number,
	permanent: boolean,
	sourceUnit?: Unit // sources like orbs apply direct power increase
) => {
	const effect = (targetChara: Chara) => async () => {
		updateUnitPower(targetChara, amount, permanent);
		AudioManager.playSoundEffect("sfx_spell_innerfocus");
	};

	if (!sourceUnit) {
		for (const target of targets) {
			const targetChara = getCharaById(target.id);
			effect(targetChara)();
		}
		return;
	}

	// Use projectile animation when sourceUnit is provided
	const sourceChara = getCharaById(sourceUnit.id);

	for (const target of targets) {
		const targetChara = getCharaById(target.id);

		arcaneMissileTargeted(sourceChara, targetChara, {
			colors: [0xffa500, 0xff8c00, 0xff4500], // Orange colors
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0xffa500, 0xff8c00],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4,
			},
			onHit: effect(targetChara),
		});
	}
};
