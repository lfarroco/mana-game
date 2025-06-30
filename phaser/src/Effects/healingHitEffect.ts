import Phaser from "phaser";
import { delay } from "../Utils/animation";
import { images } from "../assets";
import { HEALING_HIT_EFFECT_CONFIG } from "../constants/constants";

export async function healingHitEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number, y: number },
	lifespan: number,
): Promise<void> {

	const particles = scene.add.particles(
		x, y,
		images.white_dot.key,
		{
			speed: HEALING_HIT_EFFECT_CONFIG.PARTICLE_SPEED,
			//light green to golden tones
			tint: HEALING_HIT_EFFECT_CONFIG.HEALING_COLORS,
			lifespan: lifespan,
			alpha: { start: 1, end: 0 },
			scale: { start: HEALING_HIT_EFFECT_CONFIG.PARTICLE_SCALE_START, end: HEALING_HIT_EFFECT_CONFIG.PARTICLE_SCALE_END },
			radial: true,
			blendMode: 'ADD',
			quantity: HEALING_HIT_EFFECT_CONFIG.PARTICLE_QUANTITY,
			frequency: HEALING_HIT_EFFECT_CONFIG.PARTICLE_FREQUENCY,
		});

	await delay(scene, lifespan * HEALING_HIT_EFFECT_CONFIG.LIFESPAN_RATIO);

	particles.stop();

	await delay(scene, lifespan);

	particles.destroy();

}
