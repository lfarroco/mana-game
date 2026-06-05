import * as Effects from "@Effects";

export function damageFx(source: Vec2, target: Vec2, onHit: () => void) {

	Effects.arcaneMissileTargeted(source, target, {
		// Red tones
		colors: [0x880808, 0xee4b2b, 0xd22b2b], //blood red, bright red, cadmium red
		amplitudeMin: 5,
		amplitudeMax: 20,
		particleScale: 1.5,
		impact: {
			colors: [0xd2691e, 0xcd853f],
			scale: 4,
			speed: 200,
			lifespan: 600,
			alpha: 0.4,
		},
		onHit,
	});

}