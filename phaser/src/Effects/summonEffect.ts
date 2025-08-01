import Phaser from "phaser";
import { delay } from "../Utils/animation";
import { images } from "../assets";
import { SUMMON_EFFECT_CONFIG } from "../constants/constants";

export async function summonEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number, y: number },
) {
	const { LIFESPAN, SCALE_START, SCALE_END, SPEED_MIN, SPEED_MAX, PARTICLE_QUANTITY, EMIT_ZONE_RADIUS, EMIT_ZONE_QUANTITY } = SUMMON_EFFECT_CONFIG;

	const summonEffect = scene.add.particles(
		x, y,
		images.light_pillar.key,
		{
			lifespan: LIFESPAN,
			scale: { start: SCALE_START, end: SCALE_END },
			alpha: { start: 1, end: 0 },
			speed: { min: SPEED_MIN, max: SPEED_MAX },
			quantity: PARTICLE_QUANTITY,
			frequency: LIFESPAN / 10, // Emit all at once
			rotate: { min: 0, max: 360 }, // Random rotation for variety
			blendMode: 'ADD',
			emitZone: {
				type: 'edge',
				source: new Phaser.Geom.Circle(0, 0, EMIT_ZONE_RADIUS),
				quantity: EMIT_ZONE_QUANTITY,
				yoyo: false
			}
		});

	await delay(scene, LIFESPAN);

	summonEffect.stop();

	await delay(scene, LIFESPAN);

	summonEffect.destroy();

}
