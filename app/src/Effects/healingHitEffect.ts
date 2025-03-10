import Phaser from "phaser";
import { delay } from "../Utils/animation";

export async function healingHitEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number, y: number },
	lifespan: number,
	speed: number,
): Promise<void> {

	const particles = scene.add.particles(x, y,
		'white-dot',
		{
			speed: 50 * speed,
			//light green to golden tones
			tint: [0x00ff00, 0x32cd32, 0x3cb371, 0x2e8b57, 0x228b22, 0x556b2f, 0x6b8e23, 0x8b4513, 0xcd853f, 0xdaa520, 0xffd700],
			lifespan: lifespan,
			alpha: { start: 1, end: 0 },
			scale: { start: 1, end: 0 },
			radial: true,
			blendMode: 'ADD',
			quantity: 5,
			frequency: 100,
		});

	await delay(scene, lifespan / 2);

	particles.stop();

	await delay(scene, lifespan);

	particles.destroy();

}
