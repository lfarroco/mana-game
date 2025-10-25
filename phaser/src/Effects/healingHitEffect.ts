import Phaser from "phaser";
import { delay } from "@Utils/animation";
import { images } from "../assets";

const HEALING_HIT_EFFECT_CONFIG = {
	PARTICLE_SPEED: 50,
	PARTICLE_SCALE_START: 3,
	PARTICLE_SCALE_END: 0,
	PARTICLE_QUANTITY: 5,
	PARTICLE_FREQUENCY: 100,
	LIFESPAN_RATIO: 0.5,
	HEALING_COLORS: [0x00ff00, 0x32cd32, 0x3cb371, 0x2e8b57, 0x228b22, 0x556b2f, 0x6b8e23, 0x8b4513, 0xcd853f, 0xdaa520, 0xffd700] as number[]
};

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
			tint: HEALING_HIT_EFFECT_CONFIG.HEALING_COLORS,
			lifespan: lifespan,
			alpha: { start: 1, end: 0 },
			scale: { start: HEALING_HIT_EFFECT_CONFIG.PARTICLE_SCALE_START, end: HEALING_HIT_EFFECT_CONFIG.PARTICLE_SCALE_END },
			radial: true,
			blendMode: 'ADD',
			quantity: HEALING_HIT_EFFECT_CONFIG.PARTICLE_QUANTITY,
			frequency: HEALING_HIT_EFFECT_CONFIG.PARTICLE_FREQUENCY,
		});

	await delay(lifespan * HEALING_HIT_EFFECT_CONFIG.LIFESPAN_RATIO);

	particles.stop();

	await delay(lifespan);

	particles.destroy();

}
