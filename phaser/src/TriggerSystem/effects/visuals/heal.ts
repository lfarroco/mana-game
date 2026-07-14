import * as Effects from "@FX";

export function healFx(
	source: Vec2,
	target: Vec2,
	onHit: () => void
) {
	Effects.arcaneMissileTargeted(
		source,
		target,
		{
			colors: [0x00ff00, 0x32cd32, 0x7fff00], // Green colors
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0x00ff00, 0x32cd32],
				scale: 4,
				speed: 200,
				lifespan: 600,
				alpha: 0.4,
			},
			onHit,
		});

}