import { asVec2, sumVec2, vec2 } from "../Models/Geometry";
import { TILE_WIDTH } from "../Scenes/Battleground/constants";
import { delay } from "../Utils/animation";

export async function explodeEffect(
	scene: Phaser.Scene,
	speed: number,
	source: { x: number; y: number; },
) {

	const lifespan = 1000 / speed;

	const sparks = scene.add.particles(
		source.x,
		source.y,
		'light-pillar',
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
	const energy = scene.add.particles(source.x, source.y, 'white-dot', {
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
		speed: 200 * speed,
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

	impactEffect(scene, source, speed, lifespan);

	await delay(scene, lifespan / 4);

	[
		vec2(0, -TILE_WIDTH),
		vec2(0, TILE_WIDTH),
		vec2(TILE_WIDTH, 0),
		vec2(-TILE_WIDTH, 0),
		vec2(TILE_WIDTH, TILE_WIDTH),
		vec2(-TILE_WIDTH, -TILE_WIDTH),
		vec2(-TILE_WIDTH, TILE_WIDTH),
		vec2(TILE_WIDTH, -TILE_WIDTH),

	]
		.map(v => impactEffect(scene, sumVec2(asVec2(source))(v), speed, lifespan / 3))


}


function impactEffect(scene: Phaser.Scene, target: { x: number; y: number; }, speed: number, lifespan: number) {
	const particle = scene.add.particles(
		target.x,
		target.y,
		'white-dot',
		{
			speed: 300 * speed,
			tint: [0xff0000, 0xffff00, 0xffa500],
			lifespan: lifespan,
			alpha: { start: 0.5, end: 0 },
			scale: { start: 4, end: 8 },
			blendMode: 'ADD',
			frequency: 5,
			stopAfter: 30
		}
	);

	scene.time.addEvent({
		delay: lifespan / 2,
		callback: () => {
			particle.stop()
		}
	});
	scene.time.addEvent({
		delay: lifespan + lifespan / 2,
		callback: () => {
			particle.stop()
		}
	});

	return particle
}