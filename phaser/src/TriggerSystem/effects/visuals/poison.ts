import { arcaneMissileTargeted } from "@Effects";

export function poisonFx(
	source: Vec2,
	target: Vec2,
	onHit: () => void
) {
	arcaneMissileTargeted(
		source,
		target,
		{
			colors: [0x8a2be2, 0x9932cc, 0x800080], //purple tones
			amplitudeMin: 5,
			amplitudeMax: 15,
			particleScale: 1.5,
			impact: {
				colors: [0x00ffff, 0x87ceeb],
				scale: 4,
				speed: 200,
				lifespan: 600,
				alpha: 0.4,
			},
			onHit,
		}
	);


}