import { delay } from "../Utils/animation";

type ImpactEffctProps = {
	scene: Phaser.Scene;
	location: { x: number; y: number; };
	pointA: { x: number; y: number; };
	pointB: { x: number; y: number; };
	speed: number;
};

export async function impactEffect({ scene, location, pointA, pointB, speed }: ImpactEffctProps) {

	const angle = Phaser.Math.Angle.BetweenPoints(pointA, pointB);

	const particles = scene.add.particles(
		location.x, location.y,
		'white-dot', {
		speed: 200 * speed,
		lifespan: 600 / speed,
		angle: {
			min: Phaser.Math.RadToDeg(angle) - 40,
			max: Phaser.Math.RadToDeg(angle) + 40
		},
		gravityY: 0,
		alpha: { start: 1, end: 0, ease: 'sine.out' },
		maxAliveParticles: 5,
		scale: { min: 1, max: 6, },
		stopAfter: 5
	});

	await delay(scene, 600 / speed);

	particles.destroy();
}
