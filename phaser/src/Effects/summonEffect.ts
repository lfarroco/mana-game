import Phaser from "phaser";
import { delay } from "../Utils/animation";
import { images } from "../assets";

export async function summonEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number, y: number },
) {
	const lifespan = 300;

	const summonEffect = scene.add.particles(
		x, y,
		images.light_pillar.key,
		{
			lifespan,
			scale: { start: 0.05, end: 0.3 },
			alpha: { start: 1, end: 0 },
			speed: { min: 100, max: 200 },
			quantity: 4,
			frequency: lifespan / 10, // Emit all at once
			rotate: { min: 0, max: 360 }, // Random rotation for variety
			blendMode: 'ADD',
			emitZone: {
				type: 'edge',
				source: new Phaser.Geom.Circle(0, 0, 10),
				quantity: 8,
				yoyo: false
			}
		});


	await delay(scene, lifespan);

	summonEffect.stop();

	await delay(scene, lifespan);

	summonEffect.destroy();

}
