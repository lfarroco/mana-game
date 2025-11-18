import { arcaneMissileTargeted } from "../../Effects/arcaneMissileTargeted";
import { slowEffect } from "../../Effects/slowEffect";
import { Chara, getCharaById } from "@Systems/Chara/Chara";
import { Unit } from "@Models/Entities/Unit";

export async function applySlowLogicIO(sourceUnit: Unit, targets: Unit[], duration: number) {
	const effect = (target: Unit, targetChara: Chara) => async () => {
		target.slowed += duration;

		slowEffect(targetChara, {
			duration: 1000,
			intensity: 1.5,
			color: 0xd2691e, // Orange-brownish color matching the projectile
		});
	};

	for (const target of targets) {
		const targetChara = getCharaById(target.id);
		arcaneMissileTargeted(getCharaById(sourceUnit.id), targetChara, {
			colors: [0xd2691e, 0xcd853f, 0xf4a460], // Orange-brownish colors: saddle brown, peru, sandy brown
			amplitudeMin: 5,
			amplitudeMax: 20,
			particleScale: 1.5,
			impact: {
				colors: [0xd2691e, 0xcd853f],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4,
			},
			onHit: effect(target, targetChara),
		});
	}
}
