import { images } from "../assets";
import { delay } from "@Utils/animation";

export const create = (
	scene: Phaser.Scene,
	x: number, y: number,
	target: { x: number; y: number; },
	duration: number,
) => {
	const container = scene.add.container(x, y)

	// use particle emitter to create a glowing orb
	const orb = scene.add.particles(
		0, 0,
		images.white_dot.key,
		{
			speed: { min: 100, max: 100 },
			scale: { start: 5, end: 1 },
			alpha: { start: 0.8, end: 0 },
			lifespan: 300,
			frequency: 30,
			maxAliveParticles: 30,
			blendMode: 'ADD',
			//golden tones 
			tint: [0xffff00, 0xffffff]
		});

	// radial rays of light that follow the orb
	const rays = scene.add.particles(
		10, 5,
		images.light_pillar.key,
		{
			speed: 100,
			scaleX: { min: 0.02, max: 0.04 },
			scaleY: { min: 0.4, max: 0.5 },
			alpha: { start: 1, end: 0 },
			rotate: { min: 0, max: 360 },
			tint: [0xffff00, 0xffffff],
			lifespan: 30,
			frequency: 10,
			blendMode: 'ADD'
		});

	// Create explosion emitter
	const explosionEmitter = scene.add.particles(0, 0,
		images.white_dot.key,
		{
			speed: { min: 200, max: 300 },
			angle: { min: 0, max: 360 },
			scale: { start: 8, end: 0 },
			alpha: { start: 1, end: 0 },
			lifespan: 500,
			tint: [0xffff00, 0xffffff],
			maxParticles: 10,
			blendMode: 'ADD',
		});
	explosionEmitter.stop();

	// Movement tween
	scene.tweens.add({
		targets: this,
		x: target.x,
		y: target.y,
		duration: duration,
		ease: 'Sine.InOut',
		onComplete: async () => {
			orb.stop();
			rays.stop();

			explosionEmitter.explode(50, orb.x, orb.y);

			await delay(duration * 2);
			container.destroy();
		}
	});

	container.add([orb, rays, explosionEmitter]);

	return container;
}