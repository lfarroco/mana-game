import { images } from "../assets";
import { delay } from "../Utils/animation";
import { impactEffect } from "./impactEffect";

export async function explodeEffect(
	scene: Phaser.Scene,
	source: { x: number; y: number; },
) {

	const lifespan = 1000;

	const sparks = scene.add.particles(
		source.x,
		source.y,
		images.light_pillar.key,
		{
			speed: 0,
			tint: [0xff0000, 0xffff00, 0xffa500],
			lifespan: lifespan,
			alpha: { start: 0.5, end: 0 },
			scaleX: { start: 0.1, end: 0 },
			scaleY: { start: 0.8, end: 0 },
			blendMode: 'ADD',
			frequency: 5,
			stopAfter: 15,
			rotate: { min: 0, max: 360 }

		});

	// round particles moving towards the center
	const energy = scene.add.particles(
		source.x, source.y,
		images.white_dot.key,
		{
			lifespan: lifespan,
			alpha: { start: 0.5, end: 0 },
			scale: { start: 2, end: 0 },
			blendMode: 'ADD',
			frequency: 70,
			emitZone: {
				type: 'edge',
				source: new Phaser.Geom.Circle(0, 0, 100),
				stepRate: 0,
				quantity: 7 // Increase quantity for smoother coverage
			},
			// Remove radial: true and control direction manually:
			speed: 200,
			maxAliveParticles: 20,
			// Override velocity direction for ALL particles:
			emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
				// Calculate direction from particle's position to center (0,0 relative to emitter)
				const angleToCenter = Phaser.Math.Angle.Between(
					particle.x, particle.y, // Particle's spawn position (on circle edge)
					0, 0                    // Center of the emitter
				);

				particle.velocityX = Math.cos(angleToCenter) * 400;
				particle.velocityY = Math.sin(angleToCenter) * 400;
			}
		});

	await delay(scene, lifespan);

	sparks.destroy();
	energy.destroy();

	await impactEffect({
		scene,
		location: source,
		pointA: source,
		pointB: source
	});

}