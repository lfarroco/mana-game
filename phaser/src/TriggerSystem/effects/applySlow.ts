import { arcaneMissileTargeted } from "../../Effects/arcaneMissileTargeted";
import { slowEffect } from "../../Effects/slowEffect";
import { Chara, getCharaById } from "@Systems/Chara/Chara";
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";

export async function applySlowLogicIO(
	_state: State,
	sourceUnit: Unit,
	targets: Unit[],
	duration: number,
	onReSlow?: (target: Unit) => void
) {
	const effect = (target: Unit, targetChara: Chara) => async () => {
		if (target.slowed > 0 && onReSlow) {
			onReSlow(target);
		}
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
			colors: [0x6E260E, 0x7B3F00, 0x6F4E37], // brown tones
			amplitudeMin: 5,
			amplitudeMax: 20,
			particleScale: 1.5,
			blendMode: Phaser.BlendModes.NORMAL,
			impact: {
				colors: [0x6E260E, 0x954535],
				scale: 2,
				speed: 200,
				lifespan: 300,
				alpha: 0.4,
			},
			onHit: effect(target, targetChara),
		});
	}
}
