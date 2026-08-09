import { arcaneMissileTargeted } from "../../../../../../FX";

export function shieldFx(source: Vec2, target: Vec2, onHit: () => void) {
	arcaneMissileTargeted(source, target, {
		//golden tones
		colors: [0xffd700, 0xd3af37, 0xffcc00],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0xffd700, 0xd3af37],
			scale: 4,
			speed: 200,
			lifespan: 600,
			alpha: 0.4,
		},
		onHit,
	});
}
