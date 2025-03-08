import { tween } from "../Utils/animation";

export async function fireballEffect(
	scene: Phaser.Scene,
	speed: number,
	source: { x: number; y: number; },
	target: { x: number; y: number; },
) {

	const angle = Phaser.Math.Angle.BetweenPoints(source, target);

	const travelDuration = 500 / speed;
	const lifespan = 400 / speed;

	const particles = scene.add.particles(
		source.x,
		source.y,
		'light',
		{
			// make particles move in the direction of the angle, using the speed
			speedX: {
				min: -Math.cos(angle - 0.2) * 200 * speed,
				max: -Math.cos(angle + 0.2) * 400 * speed
			},
			speedY: {
				min: -Math.sin(angle - 0.2) * 200 * speed,
				max: -Math.sin(angle + 0.2) * 400 * speed
			},
			//red, yellow and orage tones
			tint: [0xff0000, 0xffff00, 0xffa500],
			lifespan,
			alpha: { start: 1, end: 0 },
			scale: { start: 2, end: 0 },
			blendMode: 'ADD',
			radial: true,
		}
	);

	await tween({
		targets: [particles],
		x: target.x,
		y: target.y,
		duration: travelDuration,
	});

	particles.stop();

	scene.time.addEvent({
		delay: lifespan,
		callback: () => {
			particles.destroy();
		}
	});
}
