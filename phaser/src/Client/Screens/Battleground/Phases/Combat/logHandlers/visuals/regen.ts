import { arcaneMissileTargeted } from "Client/FX";

export function regenFx(
	source: Vec2,
	target: Vec2,
	onHit: () => void
) {
	arcaneMissileTargeted(
		source,
		target,
		{
			colors: [0x00ff00, 0x32cd32, 0x7fff00, 0x00ff00], //dark green tones
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0x00ff00, 0x32cd32],
				scale: 4,
				speed: 200,
				lifespan: 300,
				alpha: 0.4,
			},
			onHit,
		});


}