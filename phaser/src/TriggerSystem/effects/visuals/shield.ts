import * as Effects from "@Effects";

export function shieldFx(source: Vec2, target: Vec2, onHit: () => void) {

	Effects.arcaneMissileTargeted(source, target, {
		//golden tones
		colors: [
			0xFFD700,
			0xD3AF37,
			0xFFCC00,
		],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [
				0xFFD700,
				0xD3AF37,
			],
			scale: 4,
			speed: 200,
			lifespan: 600,
			alpha: 0.4,
		},
		onHit,
	});
}