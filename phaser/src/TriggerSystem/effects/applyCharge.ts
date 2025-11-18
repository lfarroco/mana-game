import { arcaneMissileTargeted } from "../../Effects/arcaneMissileTargeted";
import { hasteEffect } from "../../Effects/hasteEffect";
import { Chara, getCharaById } from "@Systems/Chara/Chara";
import { Unit } from "@Models/Entities/Unit";

export function applyChargeLogicIO(sourceUnit: Unit, targets: Unit[], amount: number) {
	const sourceChara = getCharaById(sourceUnit.id);

	const effect = (target: Unit, targetChara: Chara) => async () => {
		target.charge += amount;

		hasteEffect(targetChara, {
			duration: 1000,
			intensity: 1.5,
			color: 0xffd700, // Golden color
		});
	};

	for (const target of targets) {
		const targetChara = getCharaById(target.id);
		arcaneMissileTargeted(sourceChara, targetChara, {
			colors: [0xffd700, 0xffa500, 0xff8c00], // Golden/orange colors
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0xffd700, 0xffa500],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4,
			},
			onHit: effect(target, targetChara),
		});
	}
}
